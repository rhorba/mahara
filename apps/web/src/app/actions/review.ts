"use server";

import { ActionError } from "@/server/errors";
import { withRole } from "@/server/with-role";
import { type db, escrows, gigs, notifications, reviews, talentProfiles } from "@mahara/db";
import { and, avg, count, eq } from "drizzle-orm";
import { z } from "zod";

// ── S5-01: Create Review ─────────────────────────────────────────────────────
//
// Rules:
//  - Only talent and business can review
//  - Both must be party to the gig (via escrow)
//  - Gig must be completed
//  - One review per (gigId, reviewerId) — enforced by DB unique constraint
//  - reviewerRole derived from session (never client input)
//  - Reviewee identified from escrow: business reviews talent, talent reviews business

export const createReview = withRole(
  ["talent", "business"],
  z.object({
    gigId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
  }),
  async ({ tx, userId, role, input }) => {
    // Load gig
    const gig = await tx.query.gigs.findFirst({
      where: eq(gigs.id, input.gigId),
    });
    if (!gig) throw new ActionError(404, "Gig not found");
    if (gig.status !== "completed") {
      throw new ActionError(400, "Reviews can only be submitted for completed gigs");
    }

    // Load escrow to identify parties
    const escrow = await tx.query.escrows.findFirst({
      where: eq(escrows.gigId, input.gigId),
    });
    if (!escrow) throw new ActionError(404, "Escrow not found for this gig");

    // Verify reviewer is a party and determine reviewee
    let revieweeId: string;
    if (role === "business") {
      if (escrow.businessId !== userId) throw new ActionError(403, "Forbidden");
      revieweeId = escrow.talentId; // business reviews talent
    } else {
      if (escrow.talentId !== userId) throw new ActionError(403, "Forbidden");
      revieweeId = escrow.businessId; // talent reviews business
    }

    // Insert review (DB unique constraint on gigId+reviewerId prevents double reviews)
    const [review] = await tx
      .insert(reviews)
      .values({
        id: crypto.randomUUID(),
        gigId: input.gigId,
        reviewerId: userId,
        revieweeId,
        rating: input.rating,
        comment: input.comment ?? null,
        reviewerRole: role,
      })
      .returning();
    if (!review) throw new ActionError(500, "Failed to create review");

    // S5-02: Update talentProfile stats when talent is reviewed by business
    if (role === "business") {
      await updateTalentStats(tx, escrow.talentId, input.gigId);
    }

    // Notify the reviewee
    const gigTitle = gig.title.slice(0, 60);
    await tx.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: revieweeId,
      type: "review_requested",
      title: "Nouvel avis reçu",
      body: `Vous avez reçu un avis pour la mission "${gigTitle}".`,
      linkUrl: `/gigs/${input.gigId}`,
    });

    return review;
  },
);

// ── S5-02 helper: Recompute talentProfile rating stats ───────────────────────
//
// Called in same transaction as review insert.
// avgRating stored as 0-500 (rating * 100), supports future precision.
// verificationStatus promoted (never demoted) based on thresholds:
//   verified:   avgRating ≥ 350 (3.5★) AND reviewCount ≥ 3
//   top_talent: avgRating ≥ 450 (4.5★) AND reviewCount ≥ 10

type Db = typeof db;

async function updateTalentStats(tx: Db, talentUserId: string, gigId: string) {
  // Load current talent profile
  const profile = await tx.query.talentProfiles.findFirst({
    where: eq(talentProfiles.userId, talentUserId),
  });
  if (!profile) return;

  // Aggregate all reviews where this talent is reviewee
  const [agg] = await tx
    .select({ reviewCount: count(), avgRating: avg(reviews.rating) })
    .from(reviews)
    .where(and(eq(reviews.revieweeId, talentUserId), eq(reviews.reviewerRole, "business")));

  const newCount = Number(agg?.reviewCount ?? 0);
  const newAvgRaw = Number(agg?.avgRating ?? 0);
  const newAvg = Math.round(newAvgRaw * 100); // store as 0-500

  // Completed gigs: count distinct completed gigs this talent has been reviewed for
  const [gigCountRow] = await tx
    .select({ gigCount: count() })
    .from(reviews)
    .where(and(eq(reviews.revieweeId, talentUserId), eq(reviews.reviewerRole, "business")));
  const completedGigsCount = Number(gigCountRow?.gigCount ?? 0);

  // Determine new verification status (never demote)
  let verificationStatus = profile.verificationStatus;
  if (verificationStatus !== "top_talent") {
    if (newCount >= 10 && newAvg >= 450) {
      verificationStatus = "top_talent";
    } else if (verificationStatus !== "verified" && newCount >= 3 && newAvg >= 350) {
      verificationStatus = "verified";
    }
  }

  await tx
    .update(talentProfiles)
    .set({
      reviewCount: newCount,
      avgRating: newAvg,
      completedGigs: completedGigsCount,
      verificationStatus,
      updatedAt: new Date(),
    })
    .where(eq(talentProfiles.userId, talentUserId));
}

// ── Get reviews for a gig ────────────────────────────────────────────────────

export const getGigReviews = withRole(
  ["talent", "business", "admin"],
  z.object({ gigId: z.string().uuid() }),
  async ({ tx, input }) => {
    return tx.query.reviews.findMany({
      where: eq(reviews.gigId, input.gigId),
      with: { reviewer: true },
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    });
  },
);

// ── Check if current user has already reviewed a gig ────────────────────────

export const hasReviewedGig = withRole(
  ["talent", "business"],
  z.object({ gigId: z.string().uuid() }),
  async ({ tx, userId, input }) => {
    const existing = await tx.query.reviews.findFirst({
      where: and(eq(reviews.gigId, input.gigId), eq(reviews.reviewerId, userId)),
    });
    return { reviewed: !!existing };
  },
);
