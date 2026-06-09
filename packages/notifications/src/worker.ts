import type { SkillEntry } from "@mahara/core";
import { db, escrows, gigs, notifications, talentProfiles, users } from "@mahara/db";
import { and, eq, gte, inArray, isNotNull, lt, ne } from "drizzle-orm";
import PgBoss from "pg-boss";
import { sendGigAlertDigest } from "./email.js";
import type { GigSummary } from "./email.js";

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
      const talentSkills = ((tp.skills as SkillEntry[]) ?? []).map((s) => s.skill.toLowerCase());
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

async function escrowSweep() {
  const now = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const _h72ago = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  let notifCount = 0;

  // 1. Pending escrows not funded after 24h — remind business to pay
  const pendingOverdue = await db.query.escrows.findMany({
    where: and(eq(escrows.status, "pending"), lt(escrows.createdAt, h24ago)),
  });
  for (const escrow of pendingOverdue) {
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: escrow.businessId,
      type: "review_requested",
      title: "Paiement en attente",
      body: "Un escrow est en attente de paiement depuis plus de 24h.",
      linkUrl: "/business/dashboard",
    });
    notifCount++;
  }

  // 2. Funded escrows where gig was completed 72h+ ago without release — nudge business
  const overdueEscrows = await db.query.escrows.findMany({
    where: eq(escrows.status, "funded"),
    with: { gig: true },
  });
  for (const escrow of overdueEscrows) {
    const gig = escrow.gig;
    if (!gig || gig.status !== "completed") continue;
    const completedAt = gig.updatedAt?.getTime() ?? 0;
    if (Date.now() - completedAt < 72 * 60 * 60 * 1000) continue;
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: escrow.businessId,
      type: "payment_released",
      title: "Libérez le paiement",
      body: `La mission "${gig.title}" est terminée depuis 72h — pensez à libérer le paiement.`,
      linkUrl: `/gigs/${gig.id}`,
    });
    notifCount++;
  }

  console.log(`[worker] escrow.sweep — ${notifCount} notifications created`);
}

async function emailDigestSweep() {
  // Load available talent with their user emails
  const talent = await db.query.talentProfiles.findMany({
    where: and(ne(talentProfiles.availability, "unavailable"), isNotNull(talentProfiles.skills)),
    with: { user: true },
  });
  if (talent.length === 0) return;

  // Find open gigs from the last 7 days
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const openGigs = await db.query.gigs.findMany({
    where: and(eq(gigs.status, "open"), gte(gigs.createdAt, cutoff)),
  });
  if (openGigs.length === 0) return;

  let emailsSent = 0;
  for (const tp of talent) {
    if (!tp.user?.email) continue;
    const talentSkills = ((tp.skills as SkillEntry[]) ?? []).map((s) => s.skill.toLowerCase());

    const matched: GigSummary[] = openGigs
      .filter((g) => {
        const gigSkills = g.skills.map((s) => s.toLowerCase());
        return gigSkills.some((gs) =>
          talentSkills.some((ts) => ts.includes(gs) || gs.includes(ts)),
        );
      })
      .map((g) => ({ id: g.id, title: g.title, budget: g.budget, category: g.category }));

    if (matched.length === 0) continue;

    try {
      await sendGigAlertDigest(tp.user.email, tp.user.name ?? "Talent", matched);
      emailsSent++;
    } catch (err) {
      console.error(`[worker] email.digest failed for ${tp.user.email}:`, err);
    }
  }
  console.log(`[worker] email.digest — ${emailsSent} emails sent`);
}

async function registerQueues() {
  // Gig alert sweep: match new gigs to talent skill profiles weekly
  await boss.work("gig.alerts.sweep", { teamSize: 1, teamConcurrency: 1 }, async (job) => {
    console.log("[worker] gig.alerts.sweep started", job.id);
    await gigAlertsSweep();
  });

  // Escrow sweep: flag overdue escrows and remind parties
  await boss.work("escrow.sweep", { teamSize: 1, teamConcurrency: 1 }, async (job) => {
    console.log("[worker] escrow.sweep started", job.id);
    await escrowSweep();
  });

  // Email digest: weekly gig alert email to talent
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

// Graceful shutdown
process.on("SIGTERM", async () => {
  await boss.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await boss.stop();
  process.exit(0);
});
