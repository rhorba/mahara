"use server";

import { withRole, withRoleNoInput } from "@/server/with-role";
import { talentProfileSchema } from "@mahara/core";
import { updateTalentEmbedding } from "@mahara/matching";
import { talentProfiles } from "@mahara/db";
import { eq } from "drizzle-orm";

export const upsertTalentProfile = withRole(
  ["talent"],
  talentProfileSchema,
  async ({ tx, userId, input }) => {
    const existing = await tx.query.talentProfiles.findFirst({
      where: eq(talentProfiles.userId, userId),
    });

    if (existing) {
      const [updated] = await tx
        .update(talentProfiles)
        .set({
          bio: input.bio ?? null,
          skills: input.skills,
          portfolioUrls: input.portfolioUrls,
          languages: input.languages,
          hourlyRate: input.hourlyRate ?? null,
          availability: input.availability,
          updatedAt: new Date(),
        })
        .where(eq(talentProfiles.userId, userId))
        .returning();
      // Recompute embedding after skill change (non-blocking — best effort)
      if (updated) {
        updateTalentEmbedding(updated.id).catch(() => null);
      }
      return updated;
    }

    const [created] = await tx
      .insert(talentProfiles)
      .values({
        id: crypto.randomUUID(),
        userId,
        bio: input.bio ?? null,
        skills: input.skills,
        portfolioUrls: input.portfolioUrls,
        languages: input.languages,
        hourlyRate: input.hourlyRate ?? null,
        availability: input.availability,
      })
      .returning();
    if (created) {
      updateTalentEmbedding(created.id).catch(() => null);
    }
    return created;
  },
);

export const getOwnTalentProfile = withRoleNoInput(["talent"], async ({ tx, userId }) => {
  return tx.query.talentProfiles.findFirst({
    where: eq(talentProfiles.userId, userId),
  });
});

export const setAvailability = withRole(
  ["talent"],
  talentProfileSchema.pick({ availability: true }),
  async ({ tx, userId, input }) => {
    await tx
      .update(talentProfiles)
      .set({ availability: input.availability, updatedAt: new Date() })
      .where(eq(talentProfiles.userId, userId));
  },
);
