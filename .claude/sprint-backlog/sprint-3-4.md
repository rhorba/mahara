# Sprint 3 — AI Matching + Messaging

**Goal**: The differentiator. Match scores on proposals. Top-5 talent shown to business
on gig post. Messaging unlocked after acceptance.

**Duration**: 1–2 sessions
**Depends on**: Sprint 2 DONE

---

## Must

- [ ] S3-01 — Matching Engine: skill embedding pipeline (transformers.js in worker, 384-dim, stored in pgvector) — **Matching Engine** → handoff: Backend Dev
- [ ] S3-02 — Matching Engine: `computeMatchScore` function + `getTopTalentForGig` pgvector query — **Matching Engine** → handoff: Tester
- [ ] S3-03 — Backend Dev: trigger embedding on profile save + gig post (via pg-boss job) — **Backend Dev** → handoff: Matching Engine
- [ ] S3-04 — Backend Dev: store `matchScore` on Proposal at application time; top-5 query for gig detail — **Backend Dev** → handoff: Frontend Dev
- [ ] S3-05 — Frontend Dev: match score badge on proposal cards + gig detail top-5 panel — **Frontend Dev** → handoff: Tester
- [ ] S3-06 — Backend Dev: message thread creation (unlocks on proposal acceptance) + message CRUD — **Backend Dev** → handoff: Frontend Dev
- [ ] S3-07 — Frontend Dev: messaging UI — thread list + message view + file attachment — **Frontend Dev** → handoff: Tester
- [ ] S3-08 — Backend Dev: `gig.alerts.sweep` pg-boss job — new gigs matching talent skills → notification rows — **Backend Dev** → handoff: Frontend Dev
- [ ] S3-09 — Content Editor: FR/AR for match score labels, messaging, notifications — **Content Editor** → handoff: Frontend Dev
- [ ] S3-10 — Tester: match score determinism + RBAC (no messaging before acceptance) + embedding fixture tests — **Tester** → handoff: Project Monitor
- [ ] S3-11 — Sprint 3 snapshot — **Project Monitor** → STOP → ask for Sprint 4 approval

---

## DoD — Sprint 3
- [ ] Match score computed + stored on every proposal
- [ ] Top-5 talent shown to business on gig post/detail
- [ ] Messaging locked before proposal acceptance; unlocks after
- [ ] Gig alert sweep writes notification rows
- [ ] Embedding runs in worker (not blocking request cycle)
- [ ] Tests: match score determinism, messaging RBAC
- [ ] FR + AR; `pnpm build`/`test`/`lint` green

---

# Sprint 4 — Payments & Escrow

**Goal**: Money moves safely. Escrow funded on acceptance, released on completion,
refunded on cancellation, dispute mechanism.

**Duration**: 2 sessions
**Depends on**: Sprint 3 DONE

---

## Must

- [ ] S4-01 — Payments Engineer: `packages/payments` — `computeFees`, escrow state machine, `EscrowStateMachine` class — **Payments Engineer** → handoff: Backend Dev
- [ ] S4-02 — Payments Engineer: `PaymentGateway` interface + `DevGateway` (mock, instant succeed) — **Payments Engineer** → handoff: Backend Dev
- [ ] S4-03 — Backend Dev: `acceptProposalAndFundEscrow` action — atomic accept + escrow create + payment job + thread unlock — **Backend Dev** → handoff: Tester
- [ ] S4-04 — Backend Dev: `markGigComplete` action — marks gig done, triggers review request, unlocks release — **Backend Dev** → handoff: Payments Engineer
- [ ] S4-05 — Backend Dev: `releaseEscrow` action — requires both reviews done (or 72h timeout), calls payout, FUNDED→RELEASED — **Backend Dev** → handoff: Tester
- [ ] S4-06 — Backend Dev: `refundEscrow` action (business cancels pre-work), `openDispute` action — **Backend Dev** → handoff: Tester
- [ ] S4-07 — Backend Dev: `escrow.sweep` pg-boss job — flag overdue escrows, remind parties — **Backend Dev** → handoff: Frontend Dev
- [ ] S4-08 — Frontend Dev: escrow status banner on gig detail (state-appropriate: fund / in progress / release) — **Frontend Dev** → handoff: Tester
- [ ] S4-09 — Frontend Dev: payment confirmation page (redirect from gateway) — **Frontend Dev** → handoff: Tester
- [ ] S4-10 — Frontend Dev: talent earnings page (payment history + upcoming payout) — **Frontend Dev** → handoff: Tester
- [ ] S4-11 — Content Editor: FR/AR for escrow states, fees, payout, dispute — **Content Editor** → handoff: Frontend Dev
- [ ] S4-12 — Tester: escrow state machine — double-payout, stuck states, FUNDED check, fee math — **Tester** → handoff: Test Architect
- [ ] S4-13 — Test Architect: adversarial escrow — race conditions, failed payout, dispute split — **Test Architect** → handoff: Payments Engineer
- [ ] S4-14 — Sprint 4 snapshot — **Project Monitor** → STOP → ask for Sprint 5 approval

---

## DoD — Sprint 4
- [ ] Escrow funded on proposal acceptance (dev gateway in CI)
- [ ] Release requires both reviews; payout recorded; audit row written
- [ ] Refund on cancellation (pre-work only); dispute mechanism
- [ ] Fee amounts correct and displayed; no float arithmetic
- [ ] All money via `Money`; all transitions write AuditLog
- [ ] Escrow state machine tests: 100% transition coverage
- [ ] FR + AR; `pnpm build`/`test`/`lint` green
