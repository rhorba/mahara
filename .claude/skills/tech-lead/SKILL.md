---
name: tech-lead
description: >
  Technical leadership, architecture decisions, ADRs, stack enforcement. Trigger on:
  "architecture", "ADR", "tech stack", "system design", "refactor", "monorepo", or technical tradeoffs.
---

# Tech Lead — Mahara

## Committed Stack (FINAL — see ../../../CLAUDE.md §5)

| Concern | Choice |
|---|---|
| Web | Next.js 15 App Router, TypeScript strict |
| DB | PostgreSQL 16 + Drizzle ORM + Row-Level Security |
| Auth | Auth.js v5 — email/password (Argon2id) + Google OAuth |
| Money | integer centimes via `Money` type in `packages/core` |
| AI Matching | pgvector extension + cosine similarity scoring in `packages/matching` |
| Payments | `packages/payments` adapter interface (CMI mock in dev, real in prod) |
| Escrow | DB-level state machine in `packages/payments` |
| Jobs | pg-boss (gig alert sweeps, email digests, escrow sweeps) |
| Email | Resend via `packages/notifications` |
| Storage | Cloudflare R2 (portfolio images, deliverables) |
| i18n | next-intl (fr/ar/en), RTL mandatory |
| Styling | Tailwind v4 + shadcn/ui |
| Testing | Vitest + Playwright |
| Container | Docker Compose: postgres + web + worker + caddy |
| PM | pnpm workspaces |

## Key ADRs

### ADR-01: Role-scoped shared schema + RLS
Mahara is NOT multi-company-tenant like Naql. But role isolation is critical: talent A
cannot see talent B's private messages or earnings. RLS scopes reads to `user_id` or
`role = admin`. Defense in depth: even a query missing a WHERE clause is safe.

### ADR-02: Money as integer centimes
Same rule as Naql. All MAD amounts are integers. `Money` branded type. Escrow amounts
computed once server-side, stored, never recomputed from floats.

### ADR-03: pgvector for matching (not an external ML service)
Skill embeddings live in Postgres via the pgvector extension. Matching = cosine similarity
between gig required-skills vector and talent skill vector + weighted scoring (reviews, rate,
availability). No external API call, no cost per match, runs in the same DB transaction.

### ADR-04: Escrow is a DB state machine, not a payment gateway state
The payment gateway (CMI) processes the charge; our DB owns the escrow lifecycle
(pending → funded → released/refunded/disputed). These are decoupled. A gateway failure
does not corrupt our escrow state.

### ADR-05: Public gig pages are SSR (no auth required)
Gig browsing and talent profiles are server-rendered, cached, and publicly accessible.
This is critical for SEO and discovery. Only proposal submission + messaging require auth.

## Data Flow
```
Public visitor → Browse gigs (SSR/cached) → Sign up → Complete profile
Talent → applies → Proposal stored → Business reviews top-5 AI matches
Business → accepts proposal → Escrow funded (payment gateway) → Messaging unlocked
Work happens → Business marks complete → Both review → Escrow released → Talent paid
pg-boss sweeps → gig alert emails, escrow reminders, overdue disputes
```

## Code Standards
1. TypeScript strict — no `any`
2. Money is `Money` (centimes); never raw float currency
3. Every protected query role-scoped; RBAC on every mutation
4. All user-facing strings in i18n catalogs; logical Tailwind for RTL
5. Financial mutations write `AuditLog` in the same transaction
6. Escrow transitions are atomic DB operations with audit rows

## Handoff Points
- **→ DBA**: data requirements → Drizzle schema + RLS policies
- **→ Backend Dev**: server-action/route contracts
- **→ Matching Engine**: pgvector setup + scoring function design
- **→ Payments Engineer**: escrow state machine design
- **→ Security Engineer**: auth + RBAC architecture for review
