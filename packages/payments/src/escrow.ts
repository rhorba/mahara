import type { Database } from "@mahara/db/client";
import { auditLogs, escrows } from "@mahara/db/schema";
import type { Escrow } from "@mahara/db/schema";
import { eq } from "drizzle-orm";

export type EscrowTransition =
  | "fund"
  | "release"
  | "refund"
  | "dispute"
  | "resolve_release"
  | "resolve_refund";

export type DisputeResolution = "release" | "refund";

const VALID_TRANSITIONS: Record<string, string> = {
  "pending:fund": "funded",
  "funded:release": "released",
  "funded:refund": "refunded",
  "funded:dispute": "disputed",
  "disputed:resolve_release": "released",
  "disputed:resolve_refund": "refunded",
};

function assertTransition(currentStatus: string, transition: EscrowTransition): string {
  const key = `${currentStatus}:${transition}`;
  const next = VALID_TRANSITIONS[key];
  if (!next) {
    throw new Error(
      `Invalid escrow transition: cannot apply '${transition}' when status is '${currentStatus}'.`,
    );
  }
  return next;
}

// biome-ignore lint/suspicious/noExplicitAny: drizzle tx type varies with postgres.js
type Tx = any;

async function getEscrowOrThrow(tx: Tx, escrowId: string): Promise<Escrow> {
  const [escrow] = await tx.select().from(escrows).where(eq(escrows.id, escrowId)).limit(1);
  if (!escrow) throw new Error(`Escrow not found: ${escrowId}`);
  return escrow;
}

/**
 * EscrowStateMachine — runs all state transitions inside the caller's transaction.
 *
 * Pass `tx` from `withUserContext` (server actions) or from `db.transaction()`
 * (route handlers). All mutations + AuditLog write happen atomically in that tx.
 */
export class EscrowStateMachine {
  constructor(private readonly db: Database) {}

  /** PENDING → FUNDED. Called by payment gateway callback after charge confirmed. */
  async fund(escrowId: string, actorUserId: string, tx?: Tx): Promise<Escrow> {
    const run = async (t: Tx) => {
      const escrow = await getEscrowOrThrow(t, escrowId);
      const nextStatus = assertTransition(escrow.status, "fund");
      const now = new Date();

      const [updated] = await t
        .update(escrows)
        .set({ status: "funded", fundedAt: now })
        .where(eq(escrows.id, escrowId))
        .returning();

      await t.insert(auditLogs).values({
        actorUserId,
        entity: "escrow",
        entityId: escrowId,
        action: "fund",
        beforeData: { status: escrow.status },
        afterData: { status: nextStatus, fundedAt: now },
      });

      if (!updated) throw new Error(`Escrow update failed for ${escrowId}`);
      return updated;
    };
    return tx ? run(tx) : this.db.transaction(run);
  }

  /** FUNDED → RELEASED. Called after both reviews done (or 72h timeout). */
  async release(escrowId: string, actorUserId: string, tx?: Tx): Promise<Escrow> {
    const run = async (t: Tx) => {
      const escrow = await getEscrowOrThrow(t, escrowId);
      const nextStatus = assertTransition(escrow.status, "release");
      const now = new Date();

      const [updated] = await t
        .update(escrows)
        .set({ status: "released", releasedAt: now })
        .where(eq(escrows.id, escrowId))
        .returning();

      await t.insert(auditLogs).values({
        actorUserId,
        entity: "escrow",
        entityId: escrowId,
        action: "release",
        beforeData: { status: escrow.status },
        afterData: { status: nextStatus, releasedAt: now, talentPayout: escrow.talentPayout },
      });

      if (!updated) throw new Error(`Escrow update failed for ${escrowId}`);
      return updated;
    };
    return tx ? run(tx) : this.db.transaction(run);
  }

  /** FUNDED → REFUNDED. Business cancels before work starts. */
  async refund(escrowId: string, actorUserId: string, tx?: Tx): Promise<Escrow> {
    const run = async (t: Tx) => {
      const escrow = await getEscrowOrThrow(t, escrowId);
      const nextStatus = assertTransition(escrow.status, "refund");

      const [updated] = await t
        .update(escrows)
        .set({ status: "refunded" })
        .where(eq(escrows.id, escrowId))
        .returning();

      await t.insert(auditLogs).values({
        actorUserId,
        entity: "escrow",
        entityId: escrowId,
        action: "refund",
        beforeData: { status: escrow.status },
        afterData: { status: nextStatus },
      });

      if (!updated) throw new Error(`Escrow update failed for ${escrowId}`);
      return updated;
    };
    return tx ? run(tx) : this.db.transaction(run);
  }

  /** FUNDED → DISPUTED. Either party opens a dispute. */
  async openDispute(escrowId: string, actorUserId: string, tx?: Tx): Promise<Escrow> {
    const run = async (t: Tx) => {
      const escrow = await getEscrowOrThrow(t, escrowId);
      const nextStatus = assertTransition(escrow.status, "dispute");

      const [updated] = await t
        .update(escrows)
        .set({ status: "disputed" })
        .where(eq(escrows.id, escrowId))
        .returning();

      await t.insert(auditLogs).values({
        actorUserId,
        entity: "escrow",
        entityId: escrowId,
        action: "dispute",
        beforeData: { status: escrow.status },
        afterData: { status: nextStatus },
      });

      if (!updated) throw new Error(`Escrow update failed for ${escrowId}`);
      return updated;
    };
    return tx ? run(tx) : this.db.transaction(run);
  }

  /** DISPUTED → RELEASED | REFUNDED. Admin-only resolution. */
  async resolveDispute(
    escrowId: string,
    actorUserId: string,
    resolution: DisputeResolution,
    tx?: Tx,
  ): Promise<Escrow> {
    const run = async (t: Tx) => {
      const escrow = await getEscrowOrThrow(t, escrowId);
      const transition: EscrowTransition =
        resolution === "release" ? "resolve_release" : "resolve_refund";
      const nextStatus = assertTransition(escrow.status, transition);
      const now = new Date();

      const updatePayload =
        resolution === "release"
          ? { status: "released" as const, releasedAt: now }
          : { status: "refunded" as const };

      const [updated] = await t
        .update(escrows)
        .set(updatePayload)
        .where(eq(escrows.id, escrowId))
        .returning();

      await t.insert(auditLogs).values({
        actorUserId,
        entity: "escrow",
        entityId: escrowId,
        action: resolution === "release" ? "release" : "refund",
        beforeData: { status: escrow.status },
        afterData: { status: nextStatus, resolution },
      });

      if (!updated) throw new Error(`Escrow update failed for ${escrowId}`);
      return updated;
    };
    return tx ? run(tx) : this.db.transaction(run);
  }
}
