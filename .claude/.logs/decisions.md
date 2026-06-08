# decisions

<!-- append-only log — architecture decisions (ADRs) -->

## ADR-01: Role-scoped shared schema + RLS (not org-based multi-tenancy)
Mahara serves individual users (talent/business/admin), not companies-as-tenants. RLS
scopes reads to user_id or role=admin. This is simpler than Naql's org tenancy but still
safe: talent A structurally cannot read talent B's private data via RLS.

## ADR-02: Money as integer centimes (same as Naql)
All MAD amounts are integers. `Money` branded type in packages/core.

## ADR-03: pgvector for AI matching (no external ML service)
Skill embeddings in Postgres via pgvector. Matching = cosine similarity + weighted scoring.
Zero external API cost, runs in same DB transaction, swappable to fine-tuned model in v0.2.

## ADR-04: Escrow as DB state machine (not gateway state)
CMI/gateway processes the charge; our DB owns escrow lifecycle. Decoupled: gateway failure
doesn't corrupt escrow. All transitions atomic with AuditLog.

## ADR-05: Public gig pages are SSR (no auth required)
For SEO and discovery. Gig browsing is a major acquisition channel. Auth required only
for apply/message/pay.

## ADR-06: Auth.js v5 uses JWT session strategy (not database sessions)
Auth.js v5 supports database sessions (via DrizzleAdapter) or JWT sessions. We use JWT
so the middleware can verify sessions edge-side without a DB round-trip. The DrizzleAdapter
is still used for OAuth user/account creation. JWT carries `{ userId, role }`.

## ADR-07: Split auth config — auth.config.ts (edge) + auth.ts (Node.js)
`auth.config.ts` contains only edge-compatible code (no argon2, no postgres-js).
`middleware.ts` imports `NextAuth(authConfig).auth` for edge-safe session checks.
Server components and actions import full `auth()` from `auth.ts`.

## ADR-08: Lazy DB client via Proxy pattern
`packages/db/src/client.ts` exports a Proxy that initializes the postgres-js connection
on first use. This prevents module-load-time throws when `DATABASE_URL` is absent (e.g.,
in vitest runs for tests that mock the DB). Error surfaces on first actual query. ✅
