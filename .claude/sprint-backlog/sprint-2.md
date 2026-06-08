# Sprint 2 — Gig Marketplace: Post, Browse, Apply, Accept

**Goal**: The core marketplace loop. Business posts a gig. Talent browsing (SSR, public).
Talent applies. Business accepts/rejects.

**Duration**: 1–2 sessions
**Depends on**: Sprint 1 DONE

---

## Must

- [ ] S2-01 — UX: gig post form + browse + apply wireframes — **UX Designer** → handoff: Frontend Dev
- [ ] S2-02 — Backend Dev: gig CRUD server actions (create, update, publish, close) — **Backend Dev** → handoff: Frontend Dev
- [ ] S2-03 — Backend Dev: proposal server actions (apply, accept, reject, withdraw) — **Backend Dev** → handoff: Frontend Dev
- [ ] S2-04 — Frontend Dev: public gig browse page — SSR, paginated, filter by category/skill/budget (no auth) — **Frontend Dev** → handoff: Tester
- [ ] S2-05 — Frontend Dev: public gig detail page (SSR) + apply button (requires auth) — **Frontend Dev** → handoff: Tester
- [ ] S2-06 — Frontend Dev: business gig post form — **Frontend Dev** → handoff: Tester
- [ ] S2-07 — Frontend Dev: business gig detail with proposals list — **Frontend Dev** → handoff: Tester
- [ ] S2-08 — Frontend Dev: talent proposals list (my applications) — **Frontend Dev** → handoff: Tester
- [ ] S2-09 — Content Editor: FR/AR for gig categories, statuses, proposal statuses — **Content Editor** → handoff: Frontend Dev
- [ ] S2-10 — Tester: RBAC (talent can't post; business can't apply); proposal isolation — **Tester** → handoff: Project Monitor
- [ ] S2-11 — Sprint 2 snapshot — **Project Monitor** → STOP → ask for Sprint 3 approval

---

## DoD — Sprint 2
- [ ] Public gig browse works without auth (SSR/cached)
- [ ] Business can post + manage gigs
- [ ] Talent can apply + track proposals
- [ ] Business can accept/reject; only one proposal accepted per gig
- [ ] RBAC tests pass (talent can't post; business can't apply)
- [ ] FR + AR complete; RTL intact; `pnpm build`/`test`/`lint` green
