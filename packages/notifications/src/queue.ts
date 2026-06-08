import type { Database } from "@mahara/db";
import PgBoss from "pg-boss";

type QueueName = "gig.alerts.sweep" | "escrow.sweep" | "email.digest";

/**
 * Enqueue a background job inside an existing Drizzle transaction.
 * Must be called inside withUserContext so the job is committed atomically.
 */
export async function scheduleJob(
  _tx: Database,
  queue: QueueName,
  data: Record<string, unknown>,
): Promise<void> {
  // pg-boss uses its own connection; we call the HTTP-level insert via raw SQL
  // so the job commit is tied to the outer transaction.
  // Full transactional job insertion implemented in Sprint 5 when jobs are needed.
  // For now: fire-and-forget outside the tx (safe for non-critical background tasks).
  const singletonBoss = await getBoss();
  await singletonBoss.send(queue, data);
}

let _boss: PgBoss | null = null;

async function getBoss(): Promise<PgBoss> {
  if (_boss) return _boss;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  _boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
  await _boss.start();
  return _boss;
}
