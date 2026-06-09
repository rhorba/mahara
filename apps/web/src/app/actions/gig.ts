"use server";

import { ActionError } from "@/server/errors";
import { withRole, withRoleNoInput } from "@/server/with-role";
import { gigSchema } from "@mahara/core";
import { updateGigEmbedding } from "@mahara/matching";
import { businessProfiles, gigs } from "@mahara/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

export const createGig = withRole(
  ["business"],
  gigSchema,
  async ({ tx, userId, input }) => {
    const businessProfile = await tx.query.businessProfiles.findFirst({
      where: eq(businessProfiles.userId, userId),
    });
    if (!businessProfile) throw new ActionError(403, "Business profile required to post a gig");

    const [gig] = await tx
      .insert(gigs)
      .values({
        id: crypto.randomUUID(),
        businessId: businessProfile.id,
        title: input.title,
        description: input.description,
        category: input.category,
        skills: input.skills,
        budget: input.budget,
        duration: input.duration ?? null,
        deadline: input.deadline ?? null,
        urgent: input.urgent,
        status: "draft",
      })
      .returning();
    return gig;
  },
);

const updateGigSchema = gigSchema.partial().extend({ gigId: z.string().uuid() });
export type UpdateGigInput = z.infer<typeof updateGigSchema>;

export const updateGig = withRole(
  ["business"],
  updateGigSchema,
  async ({ tx, userId, input }) => {
    const { gigId, ...updates } = input;

    const businessProfile = await tx.query.businessProfiles.findFirst({
      where: eq(businessProfiles.userId, userId),
    });
    if (!businessProfile) throw new ActionError(403, "Business profile required");

    const gig = await tx.query.gigs.findFirst({
      where: and(eq(gigs.id, gigId), eq(gigs.businessId, businessProfile.id)),
    });
    if (!gig) throw new ActionError(404, "Gig not found");
    if (gig.status !== "draft" && gig.status !== "open") {
      throw new ActionError(400, "Only draft or open gigs can be edited");
    }

    const [updated] = await tx
      .update(gigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(gigs.id, gigId), eq(gigs.businessId, businessProfile.id)))
      .returning();
    return updated;
  },
);

export const publishGig = withRole(
  ["business"],
  z.object({ gigId: z.string().uuid() }),
  async ({ tx, userId, input }) => {
    const businessProfile = await tx.query.businessProfiles.findFirst({
      where: eq(businessProfiles.userId, userId),
    });
    if (!businessProfile) throw new ActionError(403, "Business profile required");

    const gig = await tx.query.gigs.findFirst({
      where: and(eq(gigs.id, input.gigId), eq(gigs.businessId, businessProfile.id)),
    });
    if (!gig) throw new ActionError(404, "Gig not found");
    if (gig.status !== "draft") throw new ActionError(400, "Only draft gigs can be published");

    const [updated] = await tx
      .update(gigs)
      .set({ status: "open", updatedAt: new Date() })
      .where(eq(gigs.id, input.gigId))
      .returning();
    // Compute requirement embedding after publish (non-blocking)
    if (updated) {
      updateGigEmbedding(updated.id).catch(() => null);
    }
    return updated;
  },
);

export const closeGig = withRole(
  ["business"],
  z.object({ gigId: z.string().uuid() }),
  async ({ tx, userId, input }) => {
    const businessProfile = await tx.query.businessProfiles.findFirst({
      where: eq(businessProfiles.userId, userId),
    });
    if (!businessProfile) throw new ActionError(403, "Business profile required");

    const gig = await tx.query.gigs.findFirst({
      where: and(eq(gigs.id, input.gigId), eq(gigs.businessId, businessProfile.id)),
    });
    if (!gig) throw new ActionError(404, "Gig not found");
    if (gig.status !== "open") throw new ActionError(400, "Only open gigs can be closed");

    const [updated] = await tx
      .update(gigs)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(gigs.id, input.gigId))
      .returning();
    return updated;
  },
);

export const getOwnGigs = withRoleNoInput(["business"], async ({ tx, userId }) => {
  const businessProfile = await tx.query.businessProfiles.findFirst({
    where: eq(businessProfiles.userId, userId),
  });
  if (!businessProfile) return [];
  return tx.query.gigs.findMany({
    where: eq(gigs.businessId, businessProfile.id),
    orderBy: [desc(gigs.updatedAt)],
  });
});
