# communications

<!-- append-only log — specialist handoffs -->

---

## 2026-06-08 — Session 3 handoffs

HANDOFF: Orchestrator → Security Engineer
Task: S0-07 Auth.js v5
Context: DB schema + withUserContext RLS done. Need full Auth.js implementation.
Need: Edge-safe JWT config + Credentials (Argon2id) + Google OAuth + DrizzleAdapter
Constraints: Role from session only, never from client. JWT carries userId + role.

HANDOFF: Security Engineer → Backend Dev
Task: S0-08 withRole() factory
Context: auth() from Auth.js v5 is ready. withUserContext from packages/db is ready.
Need: Server action factory pipeline: auth() → role check → Zod → withUserContext → handler
Constraints: ActionError(401/403) for auth failures. Role from session, not input.

HANDOFF: Backend Dev → Backend Dev + Frontend Dev
Task: S0-09 Signup/login
Context: withRole(), signIn/signOut from auth.ts, signupSchema from core are ready.
Need: signupAction (argon2 hash, DB insert, signIn), loginAction, login/signup pages
Constraints: Argon2id; check email uniqueness; redirect to role-specific dashboard.

HANDOFF: Backend Dev → Frontend Dev
Task: S0-12 App shell navigation
Context: auth() server component usage, all role types known, i18n translations ready.
Need: NavBar server component + LogoutButton client component; inject in [locale]/layout.tsx
Constraints: RTL-aware (use logical CSS), role-conditional links, mobile-first.

HANDOFF: Frontend Dev → DevOps
Task: S0-13, S0-14, S0-15 Docker + Worker + CI
Context: All web app code complete. Next.js standalone output configured.
Need: docker-compose.yml, Dockerfile, Dockerfile.worker, GitHub Actions CI
Constraints: pgvector/pgvector:pg16 image in CI. Gitleaks on all runs.

HANDOFF: DevOps → Tester
Task: S0-16, S0-17 Tests
Context: Core code + server actions + Docker + CI all in place.
Need: vitest configs, money/rbac unit tests, withRole unit tests (mocked), RLS integration tests
Constraints: No DB required for unit tests. RLS integration test conditional on DATABASE_URL.

HANDOFF: Tester → Project Monitor
Task: S0-18 Sprint 0 snapshot
Context: All 17 tasks written. Pending: user runs pnpm build/test/docker compose to verify.
Need: Snapshot metrics, session end, Sprint 1 approval request.
Constraints: Full RLS isolation test (ISSUE-01) deferred to Sprint 1.

---

## 2026-06-08 — Session 4 handoffs (Sprint 1)

HANDOFF: Orchestrator → DBA
Task: S1-01, S1-02 — Full schema + pgvector
Context: Sprint 0 done; users table + RLS in place. Sprint 1 needs 11 new tables.
Need: All entity tables with FK constraints, RLS policies in migration SQL, pgvector columns.
Constraints: Money as integer centimes; escrow proposalId must be UNIQUE; audit_logs admin-read-only.

HANDOFF: DBA → Security Engineer
Task: S1-03 — RLS coverage review
Context: Migration 0001 written with policies for all 11 tables.
Need: Verify no role isolation gaps; no privilege escalation vectors.
Constraints: Approved → proceed to Backend Dev; blocked → stop.

HANDOFF: Security Engineer → Backend Dev
Task: S1-04, S1-05 — Profile server actions
Context: Schema live; withRole() factory from Sprint 0 ready; Zod schemas in packages/core.
Need: upsertTalentProfile, getOwnTalentProfile for talent; upsertBusinessProfile, getOwnBusinessProfile for business.
Constraints: userId always from session; RLS enforces row ownership; no admin endpoints needed for profiles.

HANDOFF: Backend Dev → Frontend Dev + Content Editor
Task: S1-06, S1-07, S1-08, S1-10 — Profile UI + translations
Context: Server actions ready (upsertTalentProfile, upsertBusinessProfile). Schema has all fields.
Need: Talent edit form (skills array, portfolio URLs, availability toggle); business edit form; public profile page (SSR).
Constraints: RTL-safe (logical CSS props); useTranslations for all strings; no hardcoded text.

HANDOFF: Frontend Dev → Tester
Task: S1-11 — RBAC + role isolation tests
Context: All profile actions + forms done. withRole() in place.
Need: Unit tests (mocked): business→talent 403, talent→business 403, unauthenticated 401, userId from session verified.
Constraints: No DB needed for unit tests (mock withUserContext + auth).

HANDOFF: Tester → DBA (seed) + Project Monitor
Task: S1-09 seed + S1-12 snapshot
Context: All code done. Seed needs to be written idempotently.
Need: Seed data per CLAUDE.md §8 + snapshot + Sprint 2 approval request.
Constraints: argon2 added to packages/db devDeps; seed checks for existing yasmine@demo.mahara.ma.
