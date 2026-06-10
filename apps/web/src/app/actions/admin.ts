"use server";

import { ActionError } from "@/server/errors";
import { withRole } from "@/server/with-role";
import { db, escrows, gigs, users } from "@mahara/db";
import { and, count, eq, gt, gte, sql, sum } from "drizzle-orm";
import { z } from "zod";

// ── Platform KPIs ─────────────────────────────────────────────────────────────

export const getAdminKPIs = withRole(["admin"], z.object({}), async ({ tx }) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [gmvRow] = await tx
    .select({ total: sum(escrows.grossAmount) })
    .from(escrows)
    .where(eq(escrows.status, "released"));

  const [activeGigsRow] = await tx
    .select({ count: count() })
    .from(gigs)
    .where(eq(gigs.status, "open"));

  const [inProgressGigsRow] = await tx
    .select({ count: count() })
    .from(gigs)
    .where(eq(gigs.status, "in_progress"));

  const [completedGigsRow] = await tx
    .select({ count: count() })
    .from(gigs)
    .where(eq(gigs.status, "completed"));

  const [newSignupsRow] = await tx
    .select({ count: count() })
    .from(users)
    .where(gte(users.createdAt, thirtyDaysAgo));

  const [disputedRow] = await tx
    .select({ count: count() })
    .from(escrows)
    .where(eq(escrows.status, "disputed"));

  const total = (completedGigsRow?.count ?? 0) + (inProgressGigsRow?.count ?? 0);
  const completionRate = total > 0 ? Math.round(((completedGigsRow?.count ?? 0) / total) * 100) : 0;

  return {
    gmvCentimes: Number(gmvRow?.total ?? 0),
    activeGigs: activeGigsRow?.count ?? 0,
    inProgressGigs: inProgressGigsRow?.count ?? 0,
    completedGigs: completedGigsRow?.count ?? 0,
    newSignups30d: newSignupsRow?.count ?? 0,
    disputedEscrows: disputedRow?.count ?? 0,
    completionRate,
  };
});

// ── Escrow Health ─────────────────────────────────────────────────────────────

export const getEscrowHealth = withRole(["admin"], z.object({}), async ({ tx }) => {
  return tx.query.escrows.findMany({
    with: {
      gig: true,
      business: { columns: { id: true, name: true, email: true } },
      talent: { columns: { id: true, name: true, email: true } },
    },
    orderBy: (e, { desc }) => [desc(e.createdAt)],
  });
});

// ── Dispute Queue ─────────────────────────────────────────────────────────────

export const getDisputeQueue = withRole(["admin"], z.object({}), async ({ tx }) => {
  return tx.query.escrows.findMany({
    where: eq(escrows.status, "disputed"),
    with: {
      gig: true,
      business: { columns: { id: true, name: true, email: true } },
      talent: { columns: { id: true, name: true, email: true } },
    },
    orderBy: (e, { asc }) => [asc(e.createdAt)],
  });
});
