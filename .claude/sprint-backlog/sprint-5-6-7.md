# Sprint 5 — Reviews, Trust, Skill Verification, Notifications + Email

**Goal**: The trust flywheel. Reviews feed verification. Notifications keep users engaged.
Email via Resend.

**Duration**: 1–2 sessions
**Depends on**: Sprint 4 DONE

---

## Must

- [ ] S5-01 — Backend Dev: review actions (create — post-gig only; mutual; 1-5 stars + comment) — **Backend Dev** → handoff: Frontend Dev
- [ ] S5-02 — Backend Dev: update `talentProfile.avgRating` + `reviewCount` + `completedGigs` in same tx as review — **Backend Dev** → handoff: Frontend Dev
- [ ] S5-03 — Frontend Dev: post-gig review prompt (blocks release; 72h timeout auto-prompts) — **Frontend Dev** → handoff: Tester
- [ ] S5-04 — Backend Dev: skill verification flow — talent requests → admin queue → approve/reject → badge updates — **Backend Dev** → handoff: Frontend Dev
- [ ] S5-05 — Frontend Dev: talent verification request UI + status badge — **Frontend Dev** → handoff: Tester
- [ ] S5-06 — Backend Dev: notifications system — write notification rows; in-app unread count — **Backend Dev** → handoff: Frontend Dev
- [ ] S5-07 — Frontend Dev: notification bell + dropdown panel — **Frontend Dev** → handoff: Tester
- [ ] S5-08 — Notifications: Resend email integration — welcome, gig alert digest, payment confirmation, review request — **Backend Dev** → handoff: Tester
- [ ] S5-09 — Content Editor: FR/AR for reviews, trust badges, notifications, email subjects — **Content Editor** → handoff: Frontend Dev
- [ ] S5-10 — Tester: review RBAC (only post-gig parties), rating math, notification delivery — **Tester** → handoff: Project Monitor
- [ ] S5-11 — Sprint 5 snapshot — **Project Monitor** → STOP → ask for Sprint 6 approval

---

## DoD — Sprint 5
- [ ] Reviews: post-completion only, mutual, feed rating + verification
- [ ] Skill verification queue works; badge appears after admin approval
- [ ] In-app notifications for all key events
- [ ] Resend email: welcome, digest, payment confirm, review prompt
- [ ] FR + AR; RTL; `pnpm build`/`test`/`lint` green

---

# Sprint 6 — Admin Dashboard + i18n FR/AR Complete + RTL + a11y

**Goal**: Admin can operate the platform. Bilingual + RTL polished. Accessible.

**Duration**: 1–2 sessions
**Depends on**: Sprint 5 DONE

---

## Must

- [ ] S6-01 — Frontend Dev: admin dashboard — KPIs (GMV, active gigs, completion rate, new signups) — **Frontend Dev** → handoff: Tester
- [ ] S6-02 — Frontend Dev: admin verification queue — list pending verifications, approve/reject — **Frontend Dev** → handoff: Tester
- [ ] S6-03 — Frontend Dev: admin dispute queue — view evidence (messages, files), resolve — **Frontend Dev** → handoff: Tester
- [ ] S6-04 — Frontend Dev: admin escrow health monitor — funded, overdue, disputed — **Frontend Dev** → handoff: Tester
- [ ] S6-05 — Content Editor: complete fr.json + ar.json sweep — every module, no gaps — **Content Editor** → handoff: Frontend Dev
- [ ] S6-06 — Frontend Dev: i18n audit — grep for hardcoded strings; zero allowed — **Frontend Dev** → handoff: Tester
- [ ] S6-07 — Frontend Dev: RTL audit — logical Tailwind everywhere; all forms mirror in AR — **Frontend Dev** → handoff: Tester
- [ ] S6-08 — Frontend Dev: a11y — focus states, labels, contrast, keyboard nav — **Frontend Dev** → handoff: Tester
- [ ] S6-09 — Tester: i18n parity test (AR + EN have all FR keys), RTL E2E (`/ar` dir=rtl) — **Tester** → handoff: Project Monitor
- [ ] S6-10 — Sprint 6 snapshot — **Project Monitor** → STOP → ask for Sprint 7 approval

---

# Sprint 7 — Security Hardening + Performance + Deploy → v0.1 SHIP

**Goal**: Production-ready. Role isolation proven under adversarial testing. Escrow safe.
Deploys both managed cloud and self-host Docker.

**Duration**: 1–2 sessions
**Depends on**: Sprint 6 DONE

---

## Must

- [ ] S7-01 — Security Engineer: role isolation hardening — adversarial tests across every endpoint — **Security Engineer** → handoff: Tester
- [ ] S7-02 — Security Engineer: Auth.js hardening — login rate-limit + lockout; Google OAuth redirect URI locked — **Security Engineer** → handoff: Backend Dev
- [ ] S7-03 — Security Engineer: PII pass — phone/bank encrypted at rest; role-gated; nothing in logs — **Security Engineer** → handoff: Backend Dev
- [ ] S7-04 — Security Engineer: security headers + CSP + upload validation (5MB, type allowlist) — **Security Engineer** → handoff: DevOps
- [ ] S7-05 — Backend Dev: audit-log coverage — every financial mutation (escrow transitions) has AuditLog — **Backend Dev** → handoff: Tester
- [ ] S7-06 — Tech Lead + Frontend Dev: performance — SSR gig pages cached, images via R2 CDN, bundle lean — **Tech Lead** → handoff: Tester
- [ ] S7-07 — DevOps: deploy path A — Vercel + Neon/Supabase (pgvector enabled) + worker — **DevOps** → handoff: Deployment
- [ ] S7-08 — DevOps: deploy path B — `docker compose up -d` end-to-end — **DevOps** → handoff: Deployment
- [ ] S7-09 — Deployment: verify both paths; role isolation passes in prod; worker sweep active — **Deployment** → handoff: Tester
- [ ] S7-10 — Tester: full regression + role isolation suite + E2E critical paths — **Tester** → handoff: Project Monitor
- [ ] S7-11 — README.md + .env.example complete — **Project Manager** → handoff: Project Monitor
- [ ] S7-12 — Final DoD: all 20 items (CLAUDE.md §12) ✅ — **Project Monitor** → v0.1 SHIPPED

---

## DoD — Sprint 7 (= v0.1 SHIPPED)
All 20 items from CLAUDE.md §12 checked. Ship-blockers:
- [ ] Role isolation adversarial tests green
- [ ] Escrow state machine: double-payout impossible; audit trail complete
- [ ] Money exact (centimes); all financial mutations audited
- [ ] AI matching: scores computed server-side, shown transparently
- [ ] PII encrypted, role-gated, access-logged
- [ ] Deploys via managed cloud AND `docker compose up -d`
- [ ] `pnpm build` 0 TS errors; `pnpm test` green; `pnpm lint` clean; gitleaks passes
