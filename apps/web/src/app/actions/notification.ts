"use server";

import { ActionError } from "@/server/errors";
import { withRole, withRoleNoInput } from "@/server/with-role";
import { notifications } from "@mahara/db";
import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";

// ── S5-06: Get my notifications ───────────────────────────────────────────────

export const getMyNotifications = withRoleNoInput(
  ["talent", "business", "admin"],
  async ({ tx, userId }) => {
    return tx.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: (n, { desc }) => [desc(n.createdAt)],
      limit: 50,
    });
  },
);

// ── Get unread count ──────────────────────────────────────────────────────────

export const getUnreadCount = withRoleNoInput(
  ["talent", "business", "admin"],
  async ({ tx, userId }) => {
    const [row] = await tx
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    return { count: Number(row?.count ?? 0) };
  },
);

// ── Mark single notification as read ─────────────────────────────────────────

export const markNotificationRead = withRole(
  ["talent", "business", "admin"],
  z.object({ notificationId: z.string().uuid() }),
  async ({ tx, userId, input }) => {
    const notification = await tx.query.notifications.findFirst({
      where: and(eq(notifications.id, input.notificationId), eq(notifications.userId, userId)),
    });
    if (!notification) throw new ActionError(404, "Notification not found");
    if (notification.readAt) return notification; // already read

    const [updated] = await tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, userId)))
      .returning();

    return updated;
  },
);

// ── Mark all notifications as read ───────────────────────────────────────────

export const markAllNotificationsRead = withRoleNoInput(
  ["talent", "business", "admin"],
  async ({ tx, userId }) => {
    await tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

    return { ok: true };
  },
);
