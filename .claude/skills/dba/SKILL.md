---
name: dba
description: >
  Database: Drizzle ORM schema, PostgreSQL migrations, Row-Level Security, role-scoped
  queries, pgvector setup, indexing. Trigger on: "schema", "migration", "drizzle",
  "postgres", "RLS", "index", "db migrate", or any data model work.
---

# DBA — Mahara (Drizzle + PostgreSQL 16 + pgvector + RLS)

## Role
Own `packages/db`. Design the role-scoped schema, write migrations, enforce data isolation
with RLS, and provide typed query helpers.

## RLS Pattern

```sql
-- Talent can only read own private data; business sees own gigs/proposals; admin sees all
ALTER TABLE talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY talent_own ON talent_profiles
  USING (
    user_id = current_setting('app.current_user', true)::uuid
    OR current_setting('app.current_role', true) = 'admin'
  );
```

## Schema Highlights

```typescript
// packages/db/src/schema/

// pgvector extension — run once
// CREATE EXTENSION IF NOT EXISTS vector;

export const talentProfiles = pgTable('talent_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id).unique(),
  bio: text('bio'),
  skillsJson: jsonb('skills_json').notNull().default([]),  // SkillEntry[]
  portfolioUrls: text('portfolio_urls').array().notNull().default([]),
  languages: text('languages').array().notNull().default([]),
  hourlyRate: bigint('hourly_rate', { mode: 'number' }),   // centimes
  availability: availabilityEnum('availability').default('available').notNull(),
  verificationStatus: verificationEnum('verification_status').default('unverified').notNull(),
  reviewCount: integer('review_count').default(0).notNull(),
  avgRating: integer('avg_rating').default(0).notNull(),   // 0–500 (x100)
  responseRate: integer('response_rate').default(100).notNull(),
  completedGigs: integer('completed_gigs').default(0).notNull(),
  skillVector: vector('skill_vector', { dimensions: 384 }), // pgvector embedding
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  idxUserId: index('idx_talent_user').on(t.userId),
  idxVerification: index('idx_talent_verification').on(t.verificationStatus),
  idxAvailability: index('idx_talent_availability').on(t.availability),
  // HNSW index for vector search (created separately after data load)
}))

export const gigs = pgTable('gigs', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businessProfiles.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: gigCategoryEnum('category').notNull(),
  skills: text('skills').array().notNull().default([]),
  budget: bigint('budget', { mode: 'number' }).notNull(),  // centimes
  duration: text('duration'),
  deadline: timestamp('deadline', { withTimezone: true }),
  urgent: boolean('urgent').default(false).notNull(),
  status: gigStatusEnum('status').default('open').notNull(),
  assignedTalentId: uuid('assigned_talent_id'),
  requirementVector: vector('requirement_vector', { dimensions: 384 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  idxBusinessId: index('idx_gigs_business').on(t.businessId),
  idxStatus: index('idx_gigs_status').on(t.status),
  idxCategory: index('idx_gigs_category').on(t.category),
}))

// Escrow: money columns are bigint centimes
export const escrows = pgTable('escrows', {
  id: uuid('id').primaryKey().defaultRandom(),
  gigId: uuid('gig_id').notNull().references(() => gigs.id).unique(),
  businessId: uuid('business_id').notNull(),
  talentId: uuid('talent_id').notNull(),
  grossAmount: bigint('gross_amount', { mode: 'number' }).notNull(),
  platformFeeFromBusiness: bigint('platform_fee_business', { mode: 'number' }).notNull(),
  platformFeeFromTalent: bigint('platform_fee_talent', { mode: 'number' }).notNull(),
  talentPayout: bigint('talent_payout', { mode: 'number' }).notNull(),
  status: escrowStatusEnum('status').default('pending').notNull(),
  gatewayRef: text('gateway_ref'),         // CMI/payment gateway reference
  fundedAt: timestamp('funded_at', { withTimezone: true }),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

## Role-Scoped Query Helper

```typescript
// packages/db/src/role-context.ts
export async function withUserContext<T>(
  userId: string,
  role: string,
  fn: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT
      set_config('app.current_user', ${userId}, true),
      set_config('app.current_role', ${role}, true)`)
    return fn(tx)
  })
}
```

## Migration Rules
1. One migration per change; never edit applied migration
2. pgvector extension enabled in first migration
3. RLS added in the SAME migration as a new table
4. Vector indexes (HNSW) created after data seed, not in migration (performance)
5. `drizzle-kit check` before applying

## Handoff Points
- **→ Backend Dev**: schema exports, `withUserContext`, query helpers
- **→ Matching Engine**: pgvector column setup, HNSW index setup
- **→ Security Engineer**: RLS policies review (mandatory before merge)
- **→ Payments Engineer**: escrow + audit_log schema
