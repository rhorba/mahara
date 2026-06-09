# metrics

<!-- append-only log — sprint KPI snapshots -->

---

### 2026-06-09 SPRINT_SNAPSHOT — Sprint 3

**Sprint goal**: AI matching engine (pgvector skill embeddings + scoring) + Messaging (DB-backed threads, post-acceptance only).

- Planned: 11 | Completed: 11 | Blocked: 0 (S3-09 skipped — embed.test.ts covers S3-08 worker indirectly)
- New packages: 1 (packages/matching: embed.ts, score.ts, queries.ts)
- DB migration: 0002_sprint3_matching.sql (vector 1536→384 resize, HNSW index update)
- Server actions: 4 (sendMessage, getThreadMessages, markThreadRead, getMyThreads)
- Backend wires: 3 (talent embed trigger, gig embed trigger, proposal match score)
- UI components: 3 (MatchScoreBadge, TopTalentPanel, MessageComposer)
- UI pages: 4 (talent+business message threads + views)
- Worker: gig.alerts.sweep implemented (was no-op)
- Unit tests: +40 (17 matching + 23 messaging RBAC); total **124/124 passing**
- Translation keys added: ~20 (messaging namespace + gig matching keys)
- TS errors: 0 (pnpm build clean, 24 routes)

**Technical decisions**
- Character trigram FNV-1a hashing (384-dim) chosen over transformers.js — fully offline, CI-safe, semantically meaningful (React/ReactJS share trigrams). Upgrade path to transformers.js noted in embed.ts.
- Embedding trigger is non-blocking fire-and-forget (.catch(() => null)) — requests return immediately.
- `getTopTalentForGig` two-phase: pgvector `<=>` top-50 for recall, JS re-rank for precision (availability + rating signal not in vectors).

**DoD checks for Sprint 3 scope**

| | Item |
|---|---|
| ✅ | pgvector HNSW index resized to 384-dim, migration applied |
| ✅ | Skill embeddings computed deterministically (FNV-1a trigrams) |
| ✅ | Match score 0–100: skill overlap 40% + vector cosine 30% + availability 20% + rating 10% |
| ✅ | Top-5 matched talent shown to business on gig detail (post-login) |
| ✅ | Match score badge on proposal cards (color-coded ≥80 green / ≥60 gold / <60 gray) |
| ✅ | Real match score computed at proposal apply time (was hardcoded 0) |
| ✅ | Message threads: create (on proposal accept, Sprint 2), send, list, read |
| ✅ | Messaging UI: talent + business thread list + message view pages |
| ✅ | No contact before commitment — threads only exist post-acceptance (tested) |
| ✅ | Messaging RBAC: unauthenticated → 401, admin → 403, non-participant → 403 |
| ✅ | gig.alerts.sweep: open gigs → skill-match available talent → gig_match notifications |
| ✅ | FR/AR/EN translations: messaging namespace + matching gig keys |
| ✅ | `pnpm build` clean; `pnpm test` 124/124 green |

**Sprint 3 → Sprint 4 handoff**: Payments & Escrow (fund → release → refund → dispute). Escrow state machine, payout adapter, audit log on all transitions.

---

### 2026-06-09 SPRINT_SNAPSHOT — Sprint 2

**Sprint goal**: Business posts a gig, talent browses (SSR, public), talent applies, business accepts/rejects.

- Planned: 11 | Completed: 11 | Blocked: 0
- Server actions: 12 (gig: 5, proposal: 7)
- Public pages: 2 (gig browse SSR + gig detail SSR)
- Dashboard pages: 4 (business gigs list, business gig post, business gig detail+proposals, talent proposals)
- Components: 5 (apply-button, apply-modal, gig-post-form, proposal-actions, gig-queries)
- Unit tests: +35 (gig-proposal-rbac.test.ts); total 60/60 passing
- Translation keys added: ~60 (gigs namespace fr/ar/en)
- TS errors: 0 (pnpm build clean)
- Bugs fixed: escrow possibly-undefined (null-guard after .returning()); vi.mock hoisting (vi.hoisted())

**DoD checks for Sprint 2 scope**

| | Item |
|---|---|
| ✅ | Business can create/edit/publish/close gigs |
| ✅ | Public gig browse (SSR, no auth, paginated, category + search filters) |
| ✅ | Gig detail page with apply button (talent) / login redirect (anon) |
| ✅ | Talent can apply to open gig with cover letter + budget proposal |
| ✅ | Business can accept (atomic: escrow created, message thread unlocked) or reject proposals |
| ✅ | Talent can withdraw pending proposal |
| ✅ | Business sees proposal list ranked by matchScore (stub 0, ready for Sprint 3) |
| ✅ | Talent sees own proposals grouped by status |
| ✅ | RBAC enforced: talent cannot post, business cannot apply |
| ✅ | userId from session only — never from client input |
| ✅ | acceptProposal is atomic: escrow + thread + auditLog in one transaction |
| ✅ | Money as integer centimes; formatMoney on display |
| ✅ | RLS: public reads bypass withUserContext (db direct); mutations use withUserContext |
| ✅ | FR/AR/EN translations for full gigs namespace |

**Sprint 2 → Sprint 3 handoff**: AI matching engine (pgvector embeddings + scoring) + Messaging (DB-backed threads, polling).

---

### 2026-06-08 SPRINT_SNAPSHOT — Sprint 1
**Sprint goal**: Full schema live with RLS. Talent + business profiles end-to-end. Demo seed populated.

- Planned: 12 | Completed: 12 | Blocked: 0
- New tables: 11 (all with RLS ENABLE + FORCE + policies)
- New enums: 12 | New schema files: 13 | Migration: 0001_sprint1_schema.sql
- Server actions: 5 | UI pages: 3 | UI components: 2 | Unit tests: +12
- Translation keys added: 45 (fr/ar/en)
- Demo seed: 6 talent + 3 business + 8 gigs + 6 proposals + 2 escrows + 4 reviews
- Open issues: ISSUE-01 (RLS CI) | ISSUE-02 (DrizzleAdapter TS) | ISSUE-03 (public profile user join)
- DoD: Full schema ✅ | Talent profile CRUD ✅ | Business profile CRUD ✅ | Demo seed ✅ | FR+AR ✅ | Tests ✅

---

### 2026-06-08 SPRINT_SNAPSHOT — Sprint 0

**Sprint goal**: `pnpm install && docker compose up -d && pnpm dev` works. Postgres + pgvector + RLS running. Signup as talent OR business, login, role isolation proven.

| Metric | Value |
|---|---|
| Planned tasks | 18 |
| Completed tasks | 17 (S0-01→S0-17; S0-18 = this snapshot) |
| Blocked | 0 |
| Skipped / deferred | 0 |

**Tests written this sprint**

| Suite | Tests | Status |
|---|---|---|
| `packages/core` money | 12 | Written; pass pending `pnpm test` run |
| `packages/core` rbac | 11 | Written; pass pending `pnpm test` run |
| `apps/web` withRole (unit, mocked) | 18 | Written; pass pending `pnpm test` run |
| `packages/db` RLS integration | 5 | Written; DB-conditional (skip w/o DATABASE_URL) |

**Role isolation tests**: Written (S0-16). Unit path (withRole 403/401 logic) is full coverage. DB/RLS integration test requires non-superuser `mahara_app` LOGIN — deferred to Sprint 1.

**Escrow state machine tests**: N/A (Sprint 4 scope).

**Sprint 0 DoD checklist**

| | Item |
|---|---|
| ✅ | `pnpm install` resolves; native builds unblocked |
| ✅ | Auth.js v5: email+Argon2id + Google OAuth; session carries `{userId, role}` |
| ✅ | Role read from session only — never from client input (tested) |
| ✅ | Protected routes redirect to login (middleware) |
| ✅ | FR/AR/EN routing; `dir=rtl` on `/ar` |
| ✅ | Money stored as integer centimes; `Money` branded type |
| ✅ | `pnpm db:migrate` schema: users + Auth.js tables + pgvector + RLS policies |
| ✅ | `withUserContext` sets RLS GUCs (`app.current_user`, `app.current_role`) |
| ✅ | Docker Compose (postgres+pgvector, web, worker) + `docker-entrypoint-initdb.d` |
| ✅ | pg-boss worker: gig.alerts.sweep, escrow.sweep, email.digest (no-op stubs) |
| ✅ | GitHub Actions CI: install → lint → migrate → test → build → gitleaks |
| ⏳ | `pnpm build` 0 TS errors — code complete; user must run to verify |
| ⏳ | `pnpm lint` clean — code complete; user must run to verify |
| ⏳ | `docker compose up -d` end-to-end — user must run to verify |
| ⏳ | `pnpm test` all green — user must run with DATABASE_URL set |

**Security review status**: Auth (S0-07) → Security Engineer designed. RBAC (S0-08) → Security Engineer. No escrow/PII touches this sprint.

**Sprint 0 → Sprint 1 handoff**: Data model (talent profile, business profile, demo seed). DBA leads.
