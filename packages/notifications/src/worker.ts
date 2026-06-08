import PgBoss from "pg-boss";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for the worker");
}

const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  // Polling interval in ms for scheduled jobs
  maintenanceIntervalSeconds: 120,
});

boss.on("error", (err) => {
  console.error("[worker] pg-boss error:", err);
});

// ─── Queue handlers (stubs — filled in Sprint 5) ──────────────────────────

async function registerQueues() {
  // Gig alert sweep: match new gigs to talent skill profiles weekly
  await boss.work("gig.alerts.sweep", { teamSize: 1, teamConcurrency: 1 }, async (job) => {
    console.log("[worker] gig.alerts.sweep — no-op (Sprint 3+)", job.id);
  });

  // Escrow sweep: check overdue escrows, prompt dispute resolution
  await boss.work("escrow.sweep", { teamSize: 1, teamConcurrency: 1 }, async (job) => {
    console.log("[worker] escrow.sweep — no-op (Sprint 4+)", job.id);
  });

  // Email digest: weekly gig alert email to talent
  await boss.work("email.digest", { teamSize: 2, teamConcurrency: 2 }, async (job) => {
    console.log("[worker] email.digest — no-op (Sprint 5+)", job.id);
  });

  console.log("[worker] queues registered: gig.alerts.sweep, escrow.sweep, email.digest");
}

async function start() {
  await boss.start();
  await registerQueues();
  console.log("[worker] pg-boss worker started");
}

start().catch((err) => {
  console.error("[worker] fatal startup error:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await boss.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await boss.stop();
  process.exit(0);
});
