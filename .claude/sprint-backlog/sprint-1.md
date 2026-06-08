# Sprint 1 — Data Model + Talent & Business Profiles + Demo Seed

**Goal**: Full schema live with RLS. Talent and business profiles work end-to-end.
Demo seed populated with realistic Moroccan data.

**Duration**: 1–2 sessions
**Depends on**: Sprint 0 DONE
**Auto-handoff**: ENABLED

---

## Must

- [x] S1-01 — DBA: full schema — `talent_profiles`, `business_profiles`, `gigs`, `proposals`, `escrows`, `message_threads`, `messages`, `reviews`, `skill_verifications`, `notifications`, `audit_logs` — all with RLS — **DBA**
- [x] S1-02 — DBA: pgvector columns on `talent_profiles.skill_vector` + `gigs.requirement_vector`; HNSW index placeholder — **DBA**
- [x] S1-03 — Security Engineer: review RLS coverage — approved; 11 tables covered — **Security Engineer**
- [x] S1-04 — Backend Dev: talent profile server actions — upsertTalentProfile, getOwnTalentProfile, setAvailability — **Backend Dev**
- [x] S1-05 — Backend Dev: business profile server actions — upsertBusinessProfile, getOwnBusinessProfile — **Backend Dev**
- [x] S1-06 — Frontend Dev: talent profile create + edit page (skills, portfolio, availability, languages) — **Frontend Dev**
- [x] S1-07 — Frontend Dev: business profile create + edit page — **Frontend Dev**
- [x] S1-08 — Frontend Dev: public talent profile page (SSR) with `with: { user: true }` relations — **Frontend Dev**
- [x] S1-09 — DBA + Backend Dev: idempotent demo seed — 6 talent, 3 business, 8 gigs, 6 proposals, 2 escrows, 4 reviews — **DBA**
- [x] S1-10 — Content Editor: FR/AR/EN for profile fields, skill levels, availability, verification status, business size — **Content Editor**
- [x] S1-11 — Tester: RBAC tests (business→talent 403, talent→business 403, unauthenticated 401, userId from session) — **Tester**
- [x] S1-12 — Sprint 1 snapshot — **Project Monitor**

---

## DoD — Sprint 1
- [ ] Full schema with RLS; role isolation tests pass for all new tables
- [ ] Talent profile: create, edit, public view
- [ ] Business profile: create, edit
- [ ] Demo seed loads idempotently; talent and business demo accounts work
- [ ] FR + AR strings for all new fields; RTL intact
- [ ] `pnpm build`/`test`/`lint` green
