/**
 * Multi-factor match score for a talent ↔ gig pairing.
 *
 * Weights:
 *  40% — skill overlap (exact + substring match)
 *  30% — vector cosine similarity
 *  20% — availability
 *  10% — rating
 *
 * Returns an integer 0–100.
 */

import type { SkillEntry } from "@mahara/core";
import { cosineSimilarity } from "./embed";

interface TalentForScoring {
  skills: SkillEntry[];
  skillVector: number[] | null;
  availability: "available" | "in_project" | "unavailable";
  avgRating: number; // 0–500 (stored as x100, so 500 = 5.0 stars)
}

interface GigForScoring {
  skills: string[];
  requirementVector: number[] | null;
}

/**
 * computeMatchScore — deterministic, server-side only. Scores are shown
 * to both parties but computed here — never from client input.
 */
export function computeMatchScore(talent: TalentForScoring, gig: GigForScoring): number {
  // ── 1. Skill overlap (0–100) ─────────────────────────────────────────────
  const talentSkills = talent.skills.map((s) => s.skill.toLowerCase().trim());
  const gigSkills = gig.skills.map((s) => s.toLowerCase().trim());

  let matched = 0;
  for (const required of gigSkills) {
    if (talentSkills.some((t) => t === required || t.includes(required) || required.includes(t))) {
      matched++;
    }
  }
  const skillScore = gigSkills.length > 0 ? (matched / gigSkills.length) * 100 : 50;

  // ── 2. Vector similarity (0–100) ─────────────────────────────────────────
  let simScore = 50; // neutral when no vectors available
  if (
    talent.skillVector &&
    talent.skillVector.length > 0 &&
    gig.requirementVector &&
    gig.requirementVector.length > 0
  ) {
    const sim = cosineSimilarity(talent.skillVector, gig.requirementVector);
    simScore = ((sim + 1) / 2) * 100; // [-1,1] → [0,100]
  }

  // ── 3. Availability (0 or 30 or 100) ─────────────────────────────────────
  const availScore =
    talent.availability === "available" ? 100 : talent.availability === "in_project" ? 30 : 0;

  // ── 4. Rating (0–100) ────────────────────────────────────────────────────
  // avgRating is stored 0–500 (5 stars × 100). New talent: treat as neutral (50).
  const ratingScore = talent.avgRating > 0 ? (talent.avgRating / 500) * 100 : 50;

  const raw = 0.4 * skillScore + 0.3 * simScore + 0.2 * availScore + 0.1 * ratingScore;
  return Math.round(Math.max(0, Math.min(100, raw)));
}
