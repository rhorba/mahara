import { db, gigs, notifications, talentProfiles } from "@mahara/db";
import type { SkillEntry } from "@mahara/core";
import PgBoss from "pg-boss";
import { and, eq, gte, isNotNull, ne } from "drizzle-orm";

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

// ─── Queue handlers ────────────────────────────────────────────────────────

async function gigAlertsSweep() {
  // Find gigs opened in the last 7 days
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const openGigs = await db.query.gigs.findMany({
    where: and(eq(gigs.status, "open"), gte(gigs.createdAt, cutoff)),
  });
  if (openGigs.length === 0) return;

  // Load all available talent with skills
  const talent = await db.query.talentProfiles.findMany({
    where: and(ne(talentProfiles.availability, "unavailable"), isNotNull(talentProfiles.skills)),
  });

  let notifCount = 0;
  for (const gig of openGigs) {
    const gigSkills = gig.skills.map((s) => s.toLowerCase());
    for (const tp of talent) {
      const talentSkills = ((tp.skills as SkillEntry[]) ?? []).map((s) =>
        s.skill.toLowerCase(),
      );
      const hasMatch = gigSkills.some((gs) =>
        talentSkills.some((ts) => ts.includes(gs) || gs.includes(ts)),
      );
      if (!hasMatch) continue;

      // Insert notification (skip if already notified — unique constraint not enforced here,
      // so we rely on weekly cadence being infrequent enough)
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: tp.userId,
        type: "gig_match",
        title: "Nouvelle mission correspondante",
        body: `"${gig.title}" correspond à vos compétences.`,
        linkUrl: `/gigs/${gig.id}`,
      });
      notifCount++;
    }
  }
  console.log(`[worker] gig.alerts.sweep — ${notifCount} notifications created`);
}

async function registerQueues() {
  // Gig alert sweep: match new gigs to talent skill profiles weekly
  await boss.work("gig.alerts.sweep", { teamSize: 1, teamConcurrency: 1 }, async (job) => {
    console.log("[worker] gig.alerts.sweep started", job.id);
    await gigAlertsSweep();
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
