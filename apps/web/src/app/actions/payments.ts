"use server";

import { ActionError } from "@/server/errors";
import { withRole } from "@/server/with-role";
import { money } from "@mahara/core/money";
import { db, escrows, gigs, notifications, reviews } from "@mahara/db";
import { DevGateway, EscrowStateMachine } from "@mahara/payments";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

const gateway = new DevGateway();
const escrowMachine = new EscrowStateMachine(db);

// ── Business: Initiate Payment ───────────────────────────────────────────────

export const initiatePayment = withRole(
  ["business"],
  z.object({ escrowId: z.string().uuid() }),
  async ({ tx, userId, input }) => {
    const escrow = await tx.query.escrows.findFirst({
      where: eq(escrows.id, input.escrowId),
    });
    if (!escrow) throw new ActionError(404, "Escrow not found");
    if (escrow.businessId !== userId) throw new ActionError(403, "Forbidden");
    if (escrow.status !== "pending") {
      throw new ActionError(400, `Escrow is already ${escrow.status}`);
    }

    // businessTotal = grossAmount + platformFeeFromBusiness (what business actually pays)
    const businessTotal = money(escrow.grossAmount + escrow.platformFeeFromBusiness);
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/payments/callback`;

    const session = await gateway.initiateCharge(businessTotal, escrow.id, returnUrl);
    return { redirectUrl: session.redirectUrl };
  },
);

// ── Business: Mark Gig Complete ──────────────────────────────────────────────

export const markGigComplete = withRole(
  ["business"],
  z.object({ gigId: z.string().uuid() }),
  async ({ tx, userId, input }) => {
    const gig = await tx.query.gigs.findFirst({
      where: eq(gigs.id, input.gigId),
      with: { business: true },
    });
    if (!gig) throw new ActionError(404, "Gig not found");
    if (gig.business?.userId !== userId) throw new ActionError(403, "Forbidden");
    if (gig.status !== "in_progress") {
      throw new ActionError(400, "Only in-progress gigs can be marked complete");
    }

    const escrow = await tx.query.escrows.findFirst({
      where: eq(escrows.gigId, input.gigId),
    });
    if (!escrow) throw new ActionError(500, "Escrow not found for this gig");
    if (escrow.status !== "funded") {
      throw new ActionError(400, "Escrow must be funded before marking complete");
    }

    await tx
      .update(gigs)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(gigs.id, input.gigId));

    // Notify both parties to leave a review
    const notifBase = {
      type: "review_requested" as const,
      title: "Laissez un avis",
      body: `La mission "${gig.title}" est terminée — partagez votre expérience.`,
      linkUrl: `/gigs/${gig.id}`,
    };

    await tx
      .insert(notifications)
      .values([
        { id: crypto.randomUUID(), userId: userId, ...notifBase },
        ...(escrow.talentId
          ? [{ id: crypto.randomUUID(), userId: escrow.talentId, ...notifBase }]
          : []),
      ]);

    return { gigId: input.gigId, status: "completed" };
  },
);

// ── Business: Release Escrow ─────────────────────────────────────────────────

const REVIEW_TIMEOUT_MS = 72 * 60 * 60 * 1000; // 72 hours

export const releaseEscrow = withRole(
  ["business"],
  z.object({ escrowId: z.string().uuid() }),
  async ({ tx, userId, input }) => {
    const escrow = await tx.query.escrows.findFirst({
      where: eq(escrows.id, input.escrowId),
    });
    if (!escrow) throw new ActionError(404, "Escrow not found");
    if (escrow.businessId !== userId) throw new ActionError(403, "Forbidden");
    if (escrow.status !== "funded") {
      throw new ActionError(400, `Escrow status is '${escrow.status}', expected 'funded'`);
    }

    const gig = await tx.query.gigs.findFirst({ where: eq(gigs.id, escrow.gigId) });
    if (!gig) throw new ActionError(500, "Gig not found");
    if (gig.status !== "completed") {
      throw new ActionError(400, "Gig must be marked complete before releasing payment");
    }

    // Check both reviews exist, or 72h timeout has elapsed since gig completion
    const reviewCount = await tx
      .select({ count: count() })
      .from(reviews)
      .where(eq(reviews.gigId, escrow.gigId));
    const bothReviewsDone = (reviewCount[0]?.count ?? 0) >= 2;
    const timeoutElapsed = Date.now() - (gig.updatedAt?.getTime() ?? 0) > REVIEW_TIMEOUT_MS;

    if (!bothReviewsDone && !timeoutElapsed) {
      throw new ActionError(
        400,
        "Both parties must leave reviews before payment can be released (or wait 72h).",
      );
    }

    const updated = await escrowMachine.release(input.escrowId, userId, tx);

    // Notify talent of payout
    await tx.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: escrow.talentId,
      type: "payment_released",
      title: "Paiement reçu",
      body: `Votre paiement pour "${gig.title}" a été libéré.`,
      linkUrl: "/talent/earnings",
    });

    return updated;
  },
);

// ── Business: Refund Escrow ──────────────────────────────────────────────────

export const refundEscrow = withRole(
  ["business"],
  z.object({ escrowId: z.string().uuid() }),
  async ({ tx, userId, input }) => {
    const escrow = await tx.query.escrows.findFirst({
      where: eq(escrows.id, input.escrowId),
    });
    if (!escrow) throw new ActionError(404, "Escrow not found");
    if (escrow.businessId !== userId) throw new ActionError(403, "Forbidden");

    const gig = await tx.query.gigs.findFirst({ where: eq(gigs.id, escrow.gigId) });
    // Only allow refund if work hasn't started (gig is still in_progress but talent has not delivered)
    // Business cancels early — admin mediates if dispute arises after work starts
    if (gig?.status !== "in_progress") {
      throw new ActionError(400, "Refund only available for in-progress gigs before completion");
    }

    const updated = await escrowMachine.refund(input.escrowId, userId, tx);

    await tx
      .update(gigs)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(gigs.id, escrow.gigId));

    return updated;
  },
);

// ── Talent or Business: Open Dispute ────────────────────────────────────────

export const openDispute = withRole(
  ["talent", "business"],
  z.object({ escrowId: z.string().uuid() }),
  async ({ tx, userId, input }) => {
    const escrow = await tx.query.escrows.findFirst({
      where: eq(escrows.id, input.escrowId),
    });
    if (!escrow) throw new ActionError(404, "Escrow not found");

    // Both parties can open a dispute on their own escrow
    const isParty = escrow.businessId === userId || escrow.talentId === userId;
    if (!isParty) throw new ActionError(403, "Forbidden");

    const updated = await escrowMachine.openDispute(input.escrowId, userId, tx);

    // Notify the other party
    const otherPartyId = escrow.businessId === userId ? escrow.talentId : escrow.businessId;
    const gig = await tx.query.gigs.findFirst({
      where: eq(gigs.id, escrow.gigId),
      with: { business: true },
    });
    if (otherPartyId && gig) {
      await tx.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: otherPartyId,
        type: "review_requested",
        title: "Litige ouvert",
        body: `Un litige a été ouvert sur la mission "${gig.title}". L'équipe Mahara va examiner.`,
        linkUrl: `/gigs/${gig.id}`,
      });
    }

    return updated;
  },
);

// ── Admin: Resolve Dispute ───────────────────────────────────────────────────

export const resolveDispute = withRole(
  ["admin"],
  z.object({
    escrowId: z.string().uuid(),
    resolution: z.enum(["release", "refund"]),
  }),
  async ({ tx, userId, input }) => {
    const escrow = await tx.query.escrows.findFirst({
      where: and(eq(escrows.id, input.escrowId)),
    });
    if (!escrow) throw new ActionError(404, "Escrow not found");
    if (escrow.status !== "disputed") {
      throw new ActionError(400, `Escrow is '${escrow.status}', not disputed`);
    }

    const updated = await escrowMachine.resolveDispute(
      input.escrowId,
      userId,
      input.resolution,
      tx,
    );

    const gig = await tx.query.gigs.findFirst({ where: eq(gigs.id, escrow.gigId) });
    const recipientId = input.resolution === "release" ? escrow.talentId : escrow.businessId;
    const msg =
      input.resolution === "release"
        ? "Litige résolu — paiement libéré vers le talent."
        : "Litige résolu — remboursement effectué.";

    if (recipientId && gig) {
      await tx.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: recipientId,
        type: "payment_released",
        title: "Litige résolu",
        body: `${msg} Mission: "${gig.title}".`,
        linkUrl: `/gigs/${gig.id}`,
      });
    }

    return updated;
  },
);
