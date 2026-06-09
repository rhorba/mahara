"use server";

import { ActionError } from "@/server/errors";
import { withRole, withRoleNoInput } from "@/server/with-role";
import { db, messageThreads, messages, proposals } from "@mahara/db";
import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

const sendMessageSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().min(1).max(4000),
  attachmentUrl: z.string().url().optional(),
});

/**
 * Send a message in an existing thread.
 * Only the two participants (talent + business on the thread) can post.
 * RLS enforces this — the INSERT policy checks sender is a thread participant.
 */
export const sendMessage = withRole(
  ["talent", "business"],
  sendMessageSchema,
  async ({ tx, userId, input }) => {
    // Verify thread exists and user is a participant (app-level guard before RLS)
    const thread = await tx.query.messageThreads.findFirst({
      where: eq(messageThreads.id, input.threadId),
    });
    if (!thread) throw new ActionError(404, "Thread not found");
    if (thread.talentId !== userId && thread.businessId !== userId) {
      throw new ActionError(403, "Not a participant in this thread");
    }

    const [message] = await tx
      .insert(messages)
      .values({
        id: crypto.randomUUID(),
        threadId: input.threadId,
        senderId: userId,
        body: input.body,
        attachmentUrl: input.attachmentUrl ?? null,
      })
      .returning();
    if (!message) throw new ActionError(500, "Failed to send message");

    // Update lastMessageAt on the thread
    await tx
      .update(messageThreads)
      .set({ lastMessageAt: new Date() })
      .where(eq(messageThreads.id, input.threadId));

    return message;
  },
);

const getThreadMessagesSchema = z.object({
  threadId: z.string().uuid(),
  before: z.string().datetime().optional(), // cursor for pagination
  limit: z.number().int().min(1).max(100).default(50),
});

/**
 * Return messages in a thread (oldest first, with optional cursor pagination).
 * RLS SELECT policy ensures only thread participants can read.
 */
export const getThreadMessages = withRole(
  ["talent", "business"],
  getThreadMessagesSchema,
  async ({ tx, userId, input }) => {
    const thread = await tx.query.messageThreads.findFirst({
      where: eq(messageThreads.id, input.threadId),
    });
    if (!thread) throw new ActionError(404, "Thread not found");
    if (thread.talentId !== userId && thread.businessId !== userId) {
      throw new ActionError(403, "Not a participant in this thread");
    }

    return tx.query.messages.findMany({
      where: eq(messages.threadId, input.threadId),
      with: { sender: true },
      orderBy: [asc(messages.createdAt)],
      limit: input.limit,
    });
  },
);

/**
 * Mark all unread messages in a thread as read by the current user.
 */
export const markThreadRead = withRole(
  ["talent", "business"],
  z.object({ threadId: z.string().uuid() }),
  async ({ tx, userId, input }) => {
    const thread = await tx.query.messageThreads.findFirst({
      where: eq(messageThreads.id, input.threadId),
    });
    if (!thread) throw new ActionError(404, "Thread not found");
    if (thread.talentId !== userId && thread.businessId !== userId) {
      throw new ActionError(403, "Not a participant in this thread");
    }

    await tx
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.threadId, input.threadId), isNull(messages.readAt)));
  },
);

/**
 * List all threads for the current user (talent or business).
 * Returns threads ordered by lastMessageAt desc, with latest message preview.
 */
export const getMyThreads = withRoleNoInput(["talent", "business"], async ({ userId, role }) => {
  // Use db directly — RLS on messageThreads already scopes to current user
  // (withUserContext is set by withRoleNoInput via withUserContext internally)
  return db.query.messageThreads.findMany({
    where:
      role === "talent"
        ? eq(messageThreads.talentId, userId)
        : eq(messageThreads.businessId, userId),
    with: {
      gig: true,
      talent: true,
      business: true,
      messages: {
        orderBy: [desc(messages.createdAt)],
        limit: 1,
      },
    },
    orderBy: [desc(messageThreads.lastMessageAt)],
  });
});
