"use server";

import { ActionError } from "@/server/errors";
import { withRole } from "@/server/with-role";
import type { SkillEntry } from "@mahara/core/types";
import { notifications, skillVerifications, talentProfiles } from "@mahara/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

// ── S5-04: Request Skill Verification (talent only) ──────────────────────────

export const requestSkillVerification = withRole(
  ["talent"],
  z.object({
    skill: z.string().min(1).max(100),
    method: z.enum(["portfolio", "test", "admin_review"]),
  }),
  async ({ tx, userId, input }) => {
    const profile = await tx.query.talentProfiles.findFirst({
      where: eq(talentProfiles.userId, userId),
    });
    if (!profile) throw new ActionError(404, "Talent profile not found");

    // Check skill exists in profile
    const skills = (profile.skills as SkillEntry[]) ?? [];
    const hasSkill = skills.some((s) => s.skill.toLowerCase() === input.skill.toLowerCase());
    if (!hasSkill)
      throw new ActionError(400, "Skill must be on your profile before requesting verification");

    // Check no existing pending/approved request for same skill
    const existing = await tx.query.skillVerifications.findFirst({
      where: and(
        eq(skillVerifications.talentId, profile.id),
        eq(skillVerifications.skill, input.skill),
      ),
    });
    if (existing?.status === "pending") {
      throw new ActionError(409, "A verification request for this skill is already pending");
    }
    if (existing?.status === "approved") {
      throw new ActionError(409, "This skill is already verified");
    }

    const [request] = await tx
      .insert(skillVerifications)
      .values({
        id: crypto.randomUUID(),
        talentId: profile.id,
        skill: input.skill,
        method: input.method,
        status: "pending",
      })
      .returning();

    return request;
  },
);

// ── Admin: Approve Skill Verification ────────────────────────────────────────

export const approveSkillVerification = withRole(
  ["admin"],
  z.object({
    verificationId: z.string().uuid(),
    adminNote: z.string().max(500).optional(),
  }),
  async ({ tx, input }) => {
    const verification = await tx.query.skillVerifications.findFirst({
      where: eq(skillVerifications.id, input.verificationId),
      with: { talentProfile: true },
    });
    if (!verification) throw new ActionError(404, "Verification request not found");
    if (verification.status !== "pending") {
      throw new ActionError(400, `Verification is already '${verification.status}'`);
    }

    // Update verification status
    const [updated] = await tx
      .update(skillVerifications)
      .set({ status: "approved", adminNote: input.adminNote ?? null, updatedAt: new Date() })
      .where(eq(skillVerifications.id, input.verificationId))
      .returning();

    // Mark skill as verified in talent profile's skills array
    const profile = verification.talentProfile;
    if (profile) {
      const skills = (profile.skills as SkillEntry[]) ?? [];
      const updatedSkills: SkillEntry[] = skills.map((s) =>
        s.skill.toLowerCase() === verification.skill.toLowerCase() ? { ...s, verified: true } : s,
      );

      // Determine new verification status — at least "verified" once a skill is approved
      const newStatus =
        profile.verificationStatus === "top_talent"
          ? "top_talent"
          : profile.verificationStatus === "verified"
            ? "verified"
            : "verified";

      await tx
        .update(talentProfiles)
        .set({ skills: updatedSkills, verificationStatus: newStatus, updatedAt: new Date() })
        .where(eq(talentProfiles.id, profile.id));

      // Notify talent
      await tx.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: profile.userId,
        type: "verification_approved",
        title: "Compétence vérifiée !",
        body: `Votre compétence "${verification.skill}" a été vérifiée par l'équipe Mahara.`,
        linkUrl: "/talent/profile",
      });
    }

    return updated;
  },
);

// ── Admin: Reject Skill Verification ─────────────────────────────────────────

export const rejectSkillVerification = withRole(
  ["admin"],
  z.object({
    verificationId: z.string().uuid(),
    adminNote: z.string().max(500).optional(),
  }),
  async ({ tx, input }) => {
    const verification = await tx.query.skillVerifications.findFirst({
      where: eq(skillVerifications.id, input.verificationId),
      with: { talentProfile: true },
    });
    if (!verification) throw new ActionError(404, "Verification request not found");
    if (verification.status !== "pending") {
      throw new ActionError(400, `Verification is already '${verification.status}'`);
    }

    const [updated] = await tx
      .update(skillVerifications)
      .set({ status: "rejected", adminNote: input.adminNote ?? null, updatedAt: new Date() })
      .where(eq(skillVerifications.id, input.verificationId))
      .returning();

    return updated;
  },
);

// ── Talent: Get own verification requests ────────────────────────────────────

export const getMyVerifications = withRole(["talent"], z.object({}), async ({ tx, userId }) => {
  const profile = await tx.query.talentProfiles.findFirst({
    where: eq(talentProfiles.userId, userId),
  });
  if (!profile) return [];

  return tx.query.skillVerifications.findMany({
    where: eq(skillVerifications.talentId, profile.id),
    orderBy: (sv, { desc }) => [desc(sv.createdAt)],
  });
});

// ── Admin: List pending verifications ────────────────────────────────────────

export const getPendingVerifications = withRole(["admin"], z.object({}), async ({ tx }) => {
  return tx.query.skillVerifications.findMany({
    where: eq(skillVerifications.status, "pending"),
    with: { talentProfile: { with: { user: true } } },
    orderBy: (sv, { asc }) => [asc(sv.createdAt)],
  });
});
