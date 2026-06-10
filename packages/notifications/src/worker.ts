import PgBoss from "pg-boss";
import { emailDigestSweep, escrowSweep, gigAlertsSweep } from "./sweeps.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for the worker");
}

const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  maintenanceIntervalSeconds: 120,
});

boss.on("error", (err) => {
  console.error("[worker] pg-boss error:", err);
});

async function registerQueues() {
  await boss.work("gig.alerts.sweep", { teamSize: 1, teamConcurrency: 1 }, async (job) => {
    console.log("[worker] gig.alerts.sweep started", job.id);
    await gigAlertsSweep();
  });

  await boss.work("escrow.sweep", { teamSize: 1, teamConcurrency: 1 }, async (job) => {
    console.log("[worker] escrow.sweep started", job.id);
    await escrowSweep();
  });

  await boss.work("email.digest", { teamSize: 2, teamConcurrency: 2 }, async (job) => {
    console.log("[worker] email.digest started", job.id);
    await emailDigestSweep();
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

process.on("SIGTERM", async () => {
  await boss.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await boss.stop();
  process.exit(0);
});
