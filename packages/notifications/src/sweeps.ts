import type { SkillEntry } from "@mahara/core";
import { db, escrows, gigs, notifications, talentProfiles } from "@mahara/db";
import { and, eq, gte, isNotNull, lt, ne } from "drizzle-orm";
import { sendGigAlertDigest } from "./email.js";
import type { GigSummary } from "./email.js";

export async function gigAlertsSweep(): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const openGigs = await db.query.gigs.findMany({
    where: and(eq(gigs.status, "open"), gte(gigs.createdAt, cutoff)),
  });
  if (openGigs.length === 0) return;

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
  console.log(`[sweep] gig.alerts.sweep — ${notifCount} notifications created`);
}

export async function escrowSweep(): Promise<void> {
  const now = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  let notifCount = 0;

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

  const fundedEscrows = await db.query.escrows.findMany({
    where: eq(escrows.status, "funded"),
    with: { gig: true },
  });
  for (const escrow of fundedEscrows) {
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
  console.log(`[sweep] escrow.sweep — ${notifCount} notifications created`);
}

export async function emailDigestSweep(): Promise<void> {
  const talent = await db.query.talentProfiles.findMany({
    where: and(ne(talentProfiles.availability, "unavailable"), isNotNull(talentProfiles.skills)),
    with: { user: true },
  });
  if (talent.length === 0) return;

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
    } catch {
      // per-talent email failure is non-fatal
    }
  }
  console.log(`[sweep] email.digest — ${emailsSent} emails sent`);
}
