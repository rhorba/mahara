"use server";

import { withRole, withRoleNoInput } from "@/server/with-role";
import { businessProfileSchema } from "@mahara/core";
import { businessProfiles } from "@mahara/db";
import { eq } from "drizzle-orm";

export const upsertBusinessProfile = withRole(
  ["business"],
  businessProfileSchema,
  async ({ tx, userId, input }) => {
    const existing = await tx.query.businessProfiles.findFirst({
      where: eq(businessProfiles.userId, userId),
    });

    if (existing) {
      const [updated] = await tx
        .update(businessProfiles)
        .set({
          companyName: input.companyName,
          sector: input.sector ?? null,
          size: input.size ?? null,
          ice: input.ice ?? null,
          website: input.website ?? null,
          updatedAt: new Date(),
        })
        .where(eq(businessProfiles.userId, userId))
        .returning();
      return updated;
    }

    const [created] = await tx
      .insert(businessProfiles)
      .values({
        id: crypto.randomUUID(),
        userId,
        companyName: input.companyName,
        sector: input.sector ?? null,
        size: input.size ?? null,
        ice: input.ice ?? null,
        website: input.website ?? null,
      })
      .returning();
    return created;
  },
);

export const getOwnBusinessProfile = withRoleNoInput(["business"], async ({ tx, userId }) => {
  return tx.query.businessProfiles.findFirst({
    where: eq(businessProfiles.userId, userId),
  });
});
