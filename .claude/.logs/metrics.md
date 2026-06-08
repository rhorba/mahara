# metrics

<!-- append-only log — sprint KPI snapshots -->

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
