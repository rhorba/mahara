# Sprint 0 — Scaffold + Auth + RBAC + RLS

**Goal**: `pnpm install && docker compose up -d && pnpm dev` works. Postgres running with
pgvector + RLS. A user can sign up as talent OR business, log in, and **role isolation is
proven by a test**.

**Duration**: 1–2 sessions
**Auto-handoff**: ENABLED

---

## Must

- [x] S0-01 — Initialize pnpm workspace (monorepo: `apps/web`, `packages/core`, `packages/db`, `packages/matching`, `packages/payments`, `packages/notifications`, `packages/verification`) — **Tech Lead** → handoff: DBA
- [x] S0-02 — `apps/web` Next.js 15 App Router skeleton + TypeScript strict + Biome — **Tech Lead** → handoff: Frontend Dev
- [x] S0-03 — `packages/core`: `Money` type + helpers, `Role` enum, RBAC checks, shared Zod schemas — **Tech Lead** → handoff: Backend Dev
- [x] S0-04 — `packages/db`: Drizzle config, Postgres+pgvector connection, `users` table — **DBA** → handoff: DBA
- [x] S0-05 — **RLS foundation**: enable+force RLS on `users`, role-scoped policy pattern, `withUserContext` helper — **DBA** → handoff: Security Engineer
- [x] S0-06 — DB init SQL: CREATE EXTENSION vector; create RLS-bound app role — **DBA** → handoff: DevOps
- [x] S0-07 — Auth.js v5: email+password (Argon2id) + Google OAuth; session carries `{ userId, role }` — **Security Engineer** → handoff: Backend Dev
- [x] S0-08 — `withRole()` server action factory (auth → role check → Zod → withUserContext → handler) — **Backend Dev** → handoff: Tester
- [x] S0-09 — Signup flow: choose role (talent/business) → create user; login page — **Backend Dev** → handoff: Frontend Dev
- [x] S0-10 — next-intl fr/ar/en routing + `[locale]` layout with `dir` switch + placeholder messages — **Frontend Dev** (done inline with S0-02)
- [x] S0-11 — Tailwind v4 + design tokens (green/gold palette from CLAUDE.md §9) + shadcn/ui init — **UI Designer** (done inline with S0-02)
- [x] S0-12 — App shell: role-aware navigation (talent nav / business nav / admin nav), top bar — **Frontend Dev** → handoff: Tester
- [x] S0-13 — Docker Compose (postgres+pgvector + web + worker + caddy) + Dockerfile + `.env.example` — **DevOps** → handoff: DevOps
- [x] S0-14 — pg-boss worker bootstrap (registers no-op queues: gig.alerts.sweep, escrow.sweep, email.digest) — **DevOps** → handoff: Backend Dev
- [x] S0-15 — GitHub Actions CI: install → lint → db:migrate → test → build → gitleaks (use pgvector/pgvector:pg16 image) — **DevOps** → handoff: Tester
- [x] S0-16 — **Tester: role isolation test** — talent A cannot read talent B's data; business cannot see other business's gigs; crafted role in payload ignored — **Tester** → handoff: Security Engineer
- [x] S0-17 — Tester: `pnpm build` 0 TS errors, `pnpm lint` clean, login works, protected routes 401 without session — **Tester** → handoff: Project Monitor
- [x] S0-18 — Sprint 0 snapshot — **Project Monitor** → STOP → ask user for Sprint 1 approval

---

## Definition of Done — Sprint 0

- [ ] `pnpm install` + `pnpm dev` + `pnpm build` all pass
- [ ] `docker compose up -d` starts all services (postgres with pgvector, web, worker, caddy)
- [ ] `pnpm db:migrate` applies cleanly; every table has RLS enabled+forced
- [ ] pgvector extension installed (`CREATE EXTENSION IF NOT EXISTS vector`)
- [ ] Signup as talent OR business; login; session carries role
- [ ] Protected routes redirect to login when unauthenticated
- [ ] **Role isolation test passes**: talent A cannot see talent B's data; business cannot see rival's gigs
- [ ] App connects via RLS-bound role, not owner role
- [ ] FR/AR/EN routing works; `dir=rtl` on `/ar`
- [ ] `pnpm test` runs; `pnpm lint` clean; gitleaks passes
