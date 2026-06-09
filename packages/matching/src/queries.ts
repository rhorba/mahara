/**
 * DB queries for the matching engine.
 *
 * getTopTalentForGig — returns up to `limit` talent profiles ranked by
 * computed match score for a given gig.
 *
 * updateTalentEmbedding / updateGigEmbedding — store computed vectors.
 *
 * These run against the public schema with no RLS context required — talent
 * profiles have USING (true) and gig/talent vector fields are non-sensitive.
 * Called from pg-boss worker and server actions.
 */

import type { SkillEntry } from "@mahara/core";
import { db } from "@mahara/db";
import { gigs, talentProfiles } from "@mahara/db";
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { embedSkills } from "./embed";
import { computeMatchScore } from "./score";

/** Update skillVector for a talent profile. Called on profile save. */
export async function updateTalentEmbedding(talentProfileId: string): Promise<void> {
  const profile = await db.query.talentProfiles.findFirst({
    where: eq(talentProfiles.id, talentProfileId),
  });
  if (!profile || profile.skills.length === 0) return;

  const skills = (profile.skills as SkillEntry[]).map((s) => s.skill);
  const vector = embedSkills(skills);

  await db
    .update(talentProfiles)
    .set({ skillVector: vector, updatedAt: new Date() })
    .where(eq(talentProfiles.id, talentProfileId));
}

/** Update requirementVector for a gig. Called on gig publish. */
export async function updateGigEmbedding(gigId: string): Promise<void> {
  const gig = await db.query.gigs.findFirst({
    where: eq(gigs.id, gigId),
  });
  if (!gig || gig.skills.length === 0) return;

  const vector = embedSkills(gig.skills);

  await db
    .update(gigs)
    .set({ requirementVector: vector, updatedAt: new Date() })
    .where(eq(gigs.id, gigId));
}

export interface TopTalentResult {
  id: string;
  userId: string;
  skills: SkillEntry[];
  skillVector: number[] | null;
  availability: "available" | "in_project" | "unavailable";
  avgRating: number;
  completedGigs: number;
  verificationStatus: string;
  matchScore: number;
  user?: {
    id: string;
    name: string | null;
    email: string;
    city: string | null;
    avatarUrl: string | null;
  } | null;
}

/**
 * Returns up to `limit` talent profiles ranked by match score for a gig.
 *
 * Two-phase approach:
 *  1. If gig has requirementVector: pgvector cosine query narrows to top 50
 *     by vector distance, then re-rank by full computeMatchScore.
 *  2. If no vector: score all available talent by skill overlap only.
 */
export async function getTopTalentForGig(
  gigId: string,
  limit = 5,
): Promise<TopTalentResult[]> {
  const gig = await db.query.gigs.findFirst({
    where: eq(gigs.id, gigId),
  });
  if (!gig) return [];

  let candidates: Awaited<ReturnType<typeof db.query.talentProfiles.findMany>>;

  if (gig.requirementVector && gig.requirementVector.length > 0) {
    // pgvector: find closest 50 by cosine distance, then score in JS
    const vectorLiteral = `[${gig.requirementVector.join(",")}]`;
    const rows = await db
      .select({ id: talentProfiles.id })
      .from(talentProfiles)
      .where(and(isNotNull(talentProfiles.skillVector), ne(talentProfiles.availability, "unavailable")))
      .orderBy(sql`${talentProfiles.skillVector} <=> ${vectorLiteral}::vector`)
      .limit(50);

    if (rows.length === 0) {
      candidates = [];
    } else {
      const ids = rows.map((r) => r.id);
      candidates = await db.query.talentProfiles.findMany({
        where: sql`${talentProfiles.id} = ANY(${ids}::uuid[])`,
        with: { user: true },
      });
    }
  } else {
    // No vector: score all available talent (capped at 200 for performance)
    candidates = await db.query.talentProfiles.findMany({
      where: ne(talentProfiles.availability, "unavailable"),
      with: { user: true },
      limit: 200,
    });
  }

  const scored: TopTalentResult[] = candidates.map((t) => {
    const skills = (t.skills as SkillEntry[]) ?? [];
    const score = computeMatchScore(
      {
        skills,
        skillVector: t.skillVector as number[] | null,
        availability: t.availability as "available" | "in_project" | "unavailable",
        avgRating: t.avgRating,
      },
      {
        skills: gig.skills,
        requirementVector: gig.requirementVector as number[] | null,
      },
    );

    return {
      id: t.id,
      userId: t.userId,
      skills,
      skillVector: t.skillVector as number[] | null,
      availability: t.availability as "available" | "in_project" | "unavailable",
      avgRating: t.avgRating,
      completedGigs: t.completedGigs,
      verificationStatus: t.verificationStatus,
      matchScore: score,
      user: (t as typeof t & { user?: TopTalentResult["user"] }).user ?? null,
    };
  });

  return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}
