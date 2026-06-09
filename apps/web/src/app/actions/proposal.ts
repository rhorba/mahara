"use server";

import { ActionError } from "@/server/errors";
import { withRole, withRoleNoInput } from "@/server/with-role";
import { proposalSchema } from "@mahara/core";
import type { SkillEntry } from "@mahara/core";
import { computeMatchScore } from "@mahara/matching";
import {
  auditLogs,
  businessProfiles,
  escrows,
  gigs,
  messageThreads,
  proposals,
  talentProfiles,
} from "@mahara/db";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";

function computeFees(grossAmount: number) {
  const platformFeeFromBusiness = Math.round(grossAmount * 0.1);
  const platformFeeFromTalent = Math.round(grossAmount * 0.05);
  const talentPayout = grossAmount - platformFeeFromTalent;
  return { grossAmount, platformFeeFromBusiness, platformFeeFromTalent, talentPayout };
}

// ── Talent: Apply / Withdraw ─────────────────────────────────────────────────

export const applyToGig = withRole(
  ["talent"],
  proposalSchema,
  async ({ tx, userId, input }) => {
    const talentProfile = await tx.query.talentProfiles.findFirst({
      where: eq(talentProfiles.userId, userId),
    });
    if (!talentProfile) throw new ActionError(403, "Talent profile required to apply");

    const gig = await tx.query.gigs.findFirst({
      where: eq(gigs.id, input.gigId),
    });
    if (!gig) throw new ActionError(404, "Gig not found");
    if (gig.status !== "open") {
      throw new ActionError(400, "This gig is no longer accepting applications");
    }

    const matchScore = computeMatchScore(
      {
        skills: (talentProfile.skills as SkillEntry[]) ?? [],
        skillVector: talentProfile.skillVector as number[] | null,
        availability: talentProfile.availability as "available" | "in_project" | "unavailable",
        avgRating: talentProfile.avgRating,
      },
      {
        skills: gig.skills,
        requirementVector: gig.requirementVector as number[] | null,
      },
    );

    const [proposal] = await tx
      .insert(proposals)
      .values({
        id: crypto.randomUUID(),
        gigId: input.gigId,
        talentId: talentProfile.id,
        coverLetter: input.coverLetter ?? null,
        proposedBudget: input.proposedBudget ?? null,
        estimatedDays: input.estimatedDays ?? null,
        matchScore,
        status: "pending",
      })
      .returning();
    return proposal;
  },
);

export const withdrawProposal = withRole(
  ["talent"],
  z.object({ proposalId: z.string().uuid() }),
  async ({ tx, userId, input }) => {
    const talentProfile = await tx.query.talentProfiles.findFirst({
      where: eq(talentProfiles.userId, userId),
    });
    if (!talentProfile) throw new ActionError(403, "Talent profile not found");

    const proposal = await tx.query.proposals.findFirst({
      where: and(eq(proposals.id, input.proposalId), eq(proposals.talentId, talentProfile.id)),
    });
    if (!proposal) throw new ActionError(404, "Proposal not found");
    if (proposal.status !== "pending") {
      throw new ActionError(400, "Only pending proposals can be withdrawn");
    }

    const [updated] = await tx
      .update(proposals)
      .set({ status: "withdrawn", updatedAt: new Date() })
      .where(eq(proposals.id, input.proposalId))
      .returning();
    return updated;
  },
);

export const getOwnProposals = withRoleNoInput(["talent"], async ({ tx, userId }) => {
  const talentProfile = await tx.query.talentProfiles.findFirst({
    where: eq(talentProfiles.userId, userId),
  });
  if (!talentProfile) return [];
  return tx.query.proposals.findMany({
    where: eq(proposals.talentId, talentProfile.id),
    with: {
      gig: {
        with: { business: { with: { user: true } } },
      },
    },
    orderBy: [desc(proposals.createdAt)],
  });
});

// ── Business: Accept / Reject ────────────────────────────────────────────────

export const acceptProposal = withRole(
  ["business"],
  z.object({ proposalId: z.string().uuid() }),
  async ({ tx, userId, input }) => {
    const businessProfile = await tx.query.businessProfiles.findFirst({
      where: eq(businessProfiles.userId, userId),
    });
    if (!businessProfile) throw new ActionError(403, "Business profile required");

    const proposal = await tx.query.proposals.findFirst({
      where: eq(proposals.id, input.proposalId),
      with: { gig: true },
    });
    if (!proposal) throw new ActionError(404, "Proposal not found");
    if (proposal.status !== "pending") throw new ActionError(400, "Proposal is no longer pending");

    const gig = proposal.gig;
    if (!gig || gig.businessId !== businessProfile.id) {
      throw new ActionError(403, "Not authorized to manage this proposal");
    }
    if (gig.status !== "open") throw new ActionError(400, "Gig is not open");

    // talent_profiles has public SELECT policy — readable within business context
    const talentProfile = await tx.query.talentProfiles.findFirst({
      where: eq(talentProfiles.id, proposal.talentId),
    });
    if (!talentProfile) throw new ActionError(500, "Talent profile not found");

    const fees = computeFees(gig.budget);

    await tx
      .update(proposals)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(proposals.id, input.proposalId));

    await tx
      .update(proposals)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(
        and(
          eq(proposals.gigId, gig.id),
          ne(proposals.id, input.proposalId),
          eq(proposals.status, "pending"),
        ),
      );

    await tx
      .update(gigs)
      .set({ status: "in_progress", assignedTalentId: proposal.talentId, updatedAt: new Date() })
      .where(eq(gigs.id, gig.id));

    const escrowRows = await tx
      .insert(escrows)
      .values({
        id: crypto.randomUUID(),
        gigId: gig.id,
        proposalId: proposal.id,
        businessId: userId,
        talentId: talentProfile.userId,
        ...fees,
        status: "pending",
      })
      .returning();
    const escrow = escrowRows[0];
    if (!escrow) throw new ActionError(500, "Failed to create escrow");

    const threadRows = await tx
      .insert(messageThreads)
      .values({
        id: crypto.randomUUID(),
        gigId: gig.id,
        proposalId: proposal.id,
        talentId: talentProfile.userId,
        businessId: userId,
      })
      .returning();
    const thread = threadRows[0];

    await tx.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorUserId: userId,
      entity: "escrow",
      entityId: escrow.id,
      action: "create",
      afterData: escrow,
    });

    return { escrow, thread };
  },
);

export const rejectProposal = withRole(
  ["business"],
  z.object({ proposalId: z.string().uuid() }),
  async ({ tx, userId, input }) => {
    const businessProfile = await tx.query.businessProfiles.findFirst({
      where: eq(businessProfiles.userId, userId),
    });
    if (!businessProfile) throw new ActionError(403, "Business profile required");

    const proposal = await tx.query.proposals.findFirst({
      where: eq(proposals.id, input.proposalId),
      with: { gig: true },
    });
    if (!proposal) throw new ActionError(404, "Proposal not found");
    if (proposal.gig?.businessId !== businessProfile.id) {
      throw new ActionError(403, "Not authorized to manage this proposal");
    }
    if (proposal.status !== "pending") {
      throw new ActionError(400, "Only pending proposals can be rejected");
    }

    const [updated] = await tx
      .update(proposals)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(proposals.id, input.proposalId))
      .returning();
    return updated;
  },
);

export const getGigProposals = withRole(
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

    return tx.query.proposals.findMany({
      where: eq(proposals.gigId, input.gigId),
      with: { talent: { with: { user: true } } },
      orderBy: [desc(proposals.matchScore), desc(proposals.createdAt)],
    });
  },
);
