---
name: matching-engine
description: >
  AI skill matching: pgvector embeddings, cosine similarity scoring, gig alert sweeps.
  Trigger on: "matching", "AI", "score", "embedding", "pgvector", "recommendation", "gig alerts".
---

# Matching Engine — Mahara

## Role
Own `packages/matching`. Compute match scores between gigs and talent using pgvector
skill embeddings + a weighted scoring function. No external ML service in v0.1 —
everything runs in Postgres.

## How Matching Works (v0.1)

```
1. Skill Embedding:
   - Each talent's skills are embedded as a 384-dim vector (sentence-transformers/all-MiniLM-L6-v2 via Xenova/transformers.js — runs in Node, no API cost)
   - Each gig's required skills are embedded the same way
   - Both stored in Postgres via pgvector

2. Base Score (0–100):
   - Cosine similarity between gig.requirementVector and talent.skillVector → 0-60 pts
   - Skill level match (junior/intermediate/advanced/expert vs required) → 0-20 pts
   - Budget compatibility (hourlyRate vs gig budget) → 0-10 pts
   - Availability (available=10, in_project=5, unavailable=0) → 0-10 pts

3. Trust Multiplier:
   - avgRating (0-5 stars → 0.8-1.0x)
   - completedGigs (0-1.0 bonus, capped at 0.2x)
   - responseRate (below 70% → small penalty)

4. Final Score = clamp(baseScore × trustMultiplier, 0, 100)
```

## Scoring Function (packages/matching/src/score.ts)

```typescript
export function computeMatchScore(
  talent: TalentProfile,
  gig: Gig,
  similarity: number  // cosine similarity from pgvector query
): number {
  const skillSimilarityPts = similarity * 60
  const levelPts = computeLevelMatch(talent.skills, gig.skills) * 20
  const budgetPts = computeBudgetFit(talent.hourlyRate, gig.budget, gig.duration) * 10
  const availabilityPts = { available: 10, in_project: 5, unavailable: 0 }[talent.availability]

  const baseScore = skillSimilarityPts + levelPts + budgetPts + availabilityPts
  const ratingMultiplier = 0.8 + (talent.avgRating / 500) * 0.2
  const gigBonus = Math.min(talent.completedGigs / 50, 1) * 0.2
  const responsePenalty = talent.responseRate < 70 ? -5 : 0

  return Math.round(Math.min(100, baseScore * (ratingMultiplier + gigBonus) + responsePenalty))
}
```

## Top-5 Query (pgvector ANN search)

```typescript
// packages/matching/src/query.ts
export async function getTopTalentForGig(tx, gigId: string, limit = 5) {
  const gig = await getGig(tx, gigId)
  if (!gig.requirementVector) return []

  return tx.execute(sql`
    SELECT
      tp.*,
      1 - (tp.skill_vector <=> ${gig.requirementVector}::vector) AS cosine_similarity
    FROM talent_profiles tp
    WHERE tp.availability != 'unavailable'
      AND tp.verification_status != 'unverified'
    ORDER BY tp.skill_vector <=> ${gig.requirementVector}::vector
    LIMIT ${limit * 3}  -- fetch more, then re-rank by full score
  `)
  // Then re-rank by computeMatchScore in JS for full scoring
}
```

## Gig Alert Sweep (pg-boss)
Nightly job: for each talent, find new gigs since last alert with similarity > 0.6 → send email digest.

## v0.2 (do NOT build now)
- Fine-tuned model on Morocco-specific skills + Darija job titles
- Real-time matching via websocket on gig post
- Talent recommendation for businesses ("others also hired")

## Checklist
- [ ] Embeddings computed server-side on profile save + gig post
- [ ] Match score stored on Proposal record at application time
- [ ] Score shown to both talent AND business (transparency builds trust)
- [ ] Gig alert sweep is idempotent + tenant-safe

## Handoff Points
- **← DBA**: pgvector column + HNSW index setup
- **← Backend Dev**: gig post + profile save hooks to trigger embedding
- **→ Frontend Dev**: score display on proposal cards
- **→ Tester**: scoring unit tests with fixtures
