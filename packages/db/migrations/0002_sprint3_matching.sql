-- ─── Sprint 3: AI Matching — resize vectors 1536→384 ─────────────────────────
-- transformers.js (Xenova/all-MiniLM-L6-v2) produces 384-dim embeddings.
-- All existing vector columns are NULL (no embeddings stored yet), so USING NULL
-- is safe. HNSW index is dropped before ALTER and recreated at new dimension.

-- ─── talent_profiles.skill_vector: 1536 → 384 ────────────────────────────────

DROP INDEX IF EXISTS "idx_talent_profiles_skill_vector";--> statement-breakpoint

ALTER TABLE "talent_profiles"
  ALTER COLUMN "skill_vector" TYPE vector(384)
  USING NULL::vector(384);--> statement-breakpoint

CREATE INDEX "idx_talent_profiles_skill_vector" ON "talent_profiles"
  USING hnsw ("skill_vector" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE "skill_vector" IS NOT NULL;--> statement-breakpoint

-- ─── gigs.requirement_vector: 1536 → 384 ─────────────────────────────────────

ALTER TABLE "gigs"
  ALTER COLUMN "requirement_vector" TYPE vector(384)
  USING NULL::vector(384);--> statement-breakpoint

-- HNSW index on gigs for reverse-lookup (find gigs matching a talent's skills)
CREATE INDEX "idx_gigs_requirement_vector" ON "gigs"
  USING hnsw ("requirement_vector" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE "requirement_vector" IS NOT NULL;--> statement-breakpoint
