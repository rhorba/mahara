# Mahara — مهارة — Claude Code Project Bible

> This is the root business document. All specialists read this first.
> `.claude/CLAUDE.md` governs HOW the team works (workflow, autonomy, sprints).
>
> **Mahara** (مهارة — "skill") is a two-sided marketplace connecting Morocco's skilled
> youth with small businesses that need affordable, verified talent — on demand.

---

## §1 — Project Identity

**Name**: Mahara
**Domain**: mahara.ma
**Tagline (FR)**: "Les talents marocains. À portée de clic."
**Tagline (AR)**: "المواهب المغربية. بنقرة واحدة."
**Type**: Multi-tenant two-sided marketplace SaaS (Talent side + Business side).
**Purpose**: A micro-gig platform bridging Morocco's 13.3% youth unemployment gap with
small businesses that can't afford full-time hires. Talent is skill-verified;
businesses post gigs with budgets; AI matching surfaces the best fit. Built on
HCP 2026 data showing 22.7% youth activity rate and 193K new jobs needed annually.
**Audience**:
  - **Talent side**: Moroccan youth (18–35) with digital/creative/technical skills
    seeking project work, income, and portfolio building.
  - **Business side**: Moroccan SMEs and entrepreneurs needing affordable, vetted
    talent for web, design, marketing, data, and content gigs.
**Language**: French primary (`fr`), Arabic secondary (`ar`) with full RTL. English (`en`) optional.
**Tone**: Empowering, credible, direct. Youth feel seen. Businesses feel in control.

### Positioning
> "Not Fiverr. Not LinkedIn. Morocco-first, skill-verified, and built for the informal economy."

---

## §2 — User Personas

| Persona | Name | Profile | Primary Need |
|---|---|---|---|
| Talent / Youth | **Yasmine** | 23, Casablanca, UI/UX designer, unemployed | Build portfolio, earn income, get first clients |
| Talent / Youth | **Mehdi** | 26, Rabat, self-taught developer | Find project work between jobs, formalize freelance income |
| Business Owner | **Hassan** | 38, runs a small e-commerce shop | Hire someone to redesign landing page for 2,000 MAD without agency fees |
| Business Owner | **Nadia** | 44, SME owner in Marrakech | Find a social media manager for 1,500 MAD/month without full-time commitment |
| Platform Admin | **Admin** | Internal | Approve verifications, resolve disputes, monitor quality |

---

## §3 — Core Features (v0.1 scope)

### Module A — Talent Profiles
- Registration + profile: name, city, skills, portfolio links, languages, bio
- Skill badges: self-declared + platform-verified (via test or portfolio review)
- Availability status (available / in project / not available)
- Portfolio gallery: project images, links, case studies
- Reviews + ratings from completed gigs
- Verification levels: Unverified → Verified → Top Talent

### Module B — Business Profiles
- Registration + company profile: name, sector, city, ICE (optional), size
- Gig history and reputation score
- Payment method on file (required before posting)

### Module C — Gig Marketplace
- Post a gig: title, description, required skills, budget (MAD), duration, deadline
- Gig categories: Design, Development, Marketing, Data, Content, Translation, Admin
- Browse / search gigs (by skill, city, budget range, urgency)
- Apply to gig: submit proposal + optional cover letter (talent side)
- Accept / reject proposals (business side)
- Mark gig complete + release payment

### Module D — AI Matching Engine
- On gig post: auto-surface top 5 matched talent profiles ranked by skill fit,
  reviews, availability, and budget compatibility
- Weekly "Gig alerts" for talent: new gigs matching their skill profile
- Match score visible to both sides (builds trust)

### Module E — Messaging
- In-platform messaging between talent and business after matching/applying
- Thread per gig application; no external contact until gig is accepted
- File attachment support (briefs, specs, deliverables)

### Module F — Payments & Escrow
- Business deposits gig budget into escrow on acceptance
- Milestone-based or lump-sum release
- Platform fee: 10% from business + 5% from talent (configurable)
- Payout: bank transfer or mobile money (CIH/Attijariwafa / CashPlus / Wafacash)
- Invoice generated per completed gig (Moroccan-compliant, ICE + TVA if applicable)
- Dispute mechanism: escrow held, admin mediates

### Module G — Reviews & Trust
- Mutual reviews after gig completion (talent reviews business + business reviews talent)
- Review is mandatory before payment is released
- Ratings feed verification level (Top Talent badge)
- Response rate + on-time delivery tracked per talent

### Module H — Admin Dashboard
- Approve/reject skill verifications
- Monitor escrow + payment health
- Dispute resolution queue
- Platform KPIs: GMV, active gigs, new signups, completion rate

### Module I — Notifications
- In-app: new gig match, application accepted/rejected, message received, payment released
- Email: welcome, gig alerts digest, payment confirmation
- SMS (v0.2): Morocco numbers via Infobip / Twilio

### Cross-cutting (v0.1, non-negotiable)
- **Auth + RBAC** (talent / business / admin)
- **Bilingual FR/AR with RTL**
- **Moroccan payment rails** (escrow-safe)
- Audit log on all financial mutations
- Demo seed for instant onboarding

---

## §4 — Out of Scope (v0.1)

| Deferred | Feature |
|---|---|
| **v0.2** | SMS notifications (Infobip/Twilio) |
| **v0.2** | Mobile app (React Native) for talent — web-first is enough for v0.1 |
| **v0.2** | Video skill assessment / proctored tests |
| **v0.2** | Team gigs (multiple talent on one project) |
| **v0.2** | Retainer contracts (recurring monthly gigs) |
| **v0.2** | Public API for talent portfolio embed |
| **v0.3** | B2B talent sourcing (companies build talent pools) |
| **v0.3** | Apprenticeship / internship track (formalization pipeline) |
| **out** | Marketplace for physical goods, outsourcing agency model |

---

## §5 — Tech Stack (FINAL)

| Concern | Choice | Why |
|---|---|---|
| Web framework | Next.js 15 App Router | TypeScript, server components, SSR for SEO |
| Language | TypeScript strict | No `any` |
| Styling | Tailwind v4 + shadcn/ui | Consistent, fast |
| Database | PostgreSQL 16 + Drizzle ORM + RLS | Relational, RLS for tenant isolation |
| Auth | Auth.js v5 (email+password + Google OAuth) | Standard, extensible |
| Money | Integer centimes (MAD) via `Money` type | Never floats for currency |
| Payments | CMI / HPS (Moroccan card rails) behind adapter + mock in dev | Swappable, local first |
| Escrow | DB-level escrow table + state machine | Safe, auditable |
| AI Matching | pgvector (skill embeddings) + scoring function | No external ML service in v0.1 |
| Messaging | DB-backed threads (polling v0.1, websocket v0.2) | Simple, works |
| Background jobs | pg-boss | Matching alerts, payment sweeps, email digests |
| Email | Resend (transactional) | Simple, reliable |
| File storage | Cloudflare R2 (portfolio images, briefs) | Cheap, fast in region |
| i18n | next-intl (fr / ar / en) | RTL mandatory |
| Testing | Vitest + Playwright | |
| Container | Docker Compose (postgres + web + worker + caddy) | Self-host option |
| Package manager | pnpm workspaces (monorepo) | |
| Linting | Biome | |
| CI | GitHub Actions | |
| Hosting | Vercel (web) + Neon/Supabase (Postgres) + worker | |

---

## §6 — Data Model (core entities)

Multi-tenant: users belong to a `role` (talent/business/admin).
Money is stored as integer centimes. Full Drizzle schema in `packages/db/src/schema/`.

```typescript
// packages/core/src/types.ts

type Money = number // integer centimes (MAD). 1 dirham = 100. NEVER a float.

type Role = 'talent' | 'business' | 'admin'

type SkillLevel = 'junior' | 'intermediate' | 'advanced' | 'expert'

type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'top_talent'

type User = {
  id: string
  email: string
  name: string
  role: Role
  avatarUrl?: string
  city?: string
  phone?: string
  isActive: boolean
  createdAt: Date
}

type TalentProfile = {
  id: string
  userId: string
  bio?: string
  skills: SkillEntry[]                    // [{ skill: 'React', level: 'advanced' }]
  portfolioUrls: string[]
  languages: string[]                     // ['fr', 'ar', 'en']
  hourlyRate?: Money                      // optional indicative rate
  availability: 'available' | 'in_project' | 'unavailable'
  verificationStatus: VerificationStatus
  reviewCount: number
  avgRating: number                       // stored as integer 0-500 (x100)
  responseRate: number                    // 0-100
  onTimeRate: number                      // 0-100
  completedGigs: number
}

type SkillEntry = {
  skill: string
  level: SkillLevel
  verified: boolean
}

type BusinessProfile = {
  id: string
  userId: string
  companyName: string
  sector?: string
  size?: '1' | '2-10' | '11-50' | '50+'
  ice?: string                            // Moroccan tax ID
  website?: string
  verifiedBusiness: boolean
  postedGigs: number
  avgRating: number
}

type GigStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'

type Gig = {
  id: string
  businessId: string                      // foreign key to BusinessProfile
  title: string
  description: string
  category: GigCategory
  skills: string[]
  budget: Money                           // total budget in centimes
  duration?: string                       // '1 week', '1 month', etc.
  deadline?: Date
  urgent: boolean
  status: GigStatus
  assignedTalentId?: string               // set when proposal accepted
  createdAt: Date
  updatedAt: Date
}

type GigCategory = 'design' | 'development' | 'marketing' | 'data' | 'content' | 'translation' | 'admin' | 'other'

type Proposal = {
  id: string
  gigId: string
  talentId: string
  coverLetter?: string
  proposedBudget?: Money                  // talent can counter-propose
  estimatedDays?: number
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  matchScore: number                      // 0-100, computed by matching engine
  createdAt: Date
}

type Message = {
  id: string
  threadId: string
  senderId: string
  body: string
  attachmentUrl?: string
  readAt?: Date
  createdAt: Date
}

type MessageThread = {
  id: string
  gigId: string
  talentId: string
  businessId: string
  lastMessageAt: Date
  createdAt: Date
}

type EscrowStatus = 'pending' | 'funded' | 'released' | 'refunded' | 'disputed'

type Escrow = {
  id: string
  gigId: string
  businessId: string
  talentId: string
  grossAmount: Money                      // total budget
  platformFeeFromBusiness: Money          // 10%
  platformFeeFromTalent: Money            // 5%
  talentPayout: Money                     // grossAmount - platformFeeFromTalent
  status: EscrowStatus
  fundedAt?: Date
  releasedAt?: Date
  createdAt: Date
}

type Review = {
  id: string
  gigId: string
  reviewerId: string
  revieweeId: string
  rating: number                          // 1-5 (stored as integer)
  comment?: string
  reviewerRole: 'talent' | 'business'
  createdAt: Date
}

type SkillVerification = {
  id: string
  talentId: string
  skill: string
  method: 'portfolio' | 'test' | 'admin_review'
  status: 'pending' | 'approved' | 'rejected'
  adminNote?: string
  createdAt: Date
}

type Notification = {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  linkUrl?: string
  readAt?: Date
  createdAt: Date
}

type NotificationType =
  | 'gig_match'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'new_message'
  | 'payment_released'
  | 'review_requested'
  | 'verification_approved'
  | 'gig_completed'

type AuditLog = {
  id: string
  actorUserId: string
  entity: string
  entityId: string
  action: 'create' | 'update' | 'delete' | 'approve' | 'release' | 'dispute'
  before?: unknown
  after?: unknown
  at: Date
}
```

---

## §7 — Roles & Permissions

| Capability | talent | business | admin |
|---|---|---|---|
| Create / edit own profile | ✅ | ✅ | — |
| Browse gigs | ✅ | read own | ✅ |
| Post gigs | — | ✅ | ✅ |
| Apply to gig | ✅ | — | — |
| Accept proposal + fund escrow | — | ✅ | ✅ |
| Release payment | — | ✅ | ✅ |
| Message (post-match) | ✅ | ✅ | ✅ |
| Leave review | ✅ (post-gig) | ✅ (post-gig) | — |
| Verify skills | — | — | ✅ |
| Resolve disputes | — | — | ✅ |
| View platform KPIs | — | — | ✅ |
| Issue refund from escrow | — | — | ✅ |

---

## §8 — Seed / Demo Data

- 6 talent profiles (design, dev, marketing, data, content, translation — 2 verified, 1 top_talent)
- 3 business profiles (e-commerce, restaurant chain, consulting firm)
- 8 gigs across categories (2 open, 2 in_progress, 2 completed, 1 urgent)
- 4 proposals with varying match scores
- 3 completed gigs with escrow records + reviews
- Demo credentials: talent: yasmine@demo.mahara.ma / demo1234, business: hassan@demo.mahara.ma / demo1234

---

## §9 — Design Identity

- **Aesthetic**: Confident, modern, warm. Not cold fintech. Not generic freelance beige.
- **Colors**: Deep forest green (#1B4332) primary — trust, growth, Morocco's nature.
  Amber/gold accent — craftsmanship, value, Moroccan heritage.
  Clean white surfaces, generous whitespace.
- **Typography**: "Sora" display (bold, geometric), "DM Sans" body (readable, friendly),
  "Noto Kufi Arabic" for AR. All proven RTL-clean.
- **Layout**: Marketing pages (public) + dashboard (logged-in). Public pages are editorial,
  expressive. Dashboard is clean data-first.
- **Mobile-first**: Youth users are on phones. Every component designed for 375px first.
- **No stock-photo vibes**: use illustration or data-driven UI, not generic handshake photos.

---

## §10 — UX Principles

1. **Onboard in under 2 minutes** — talent profile creation takes < 5 fields to go live
2. **Trust is the product** — verification badges, review counts, match scores are prominent
3. **Morocco-first UX** — MAD currency, Moroccan cities autocomplete, Darija-aware copy
4. **No contact before commitment** — messaging unlocks only after proposal accepted (protects both)
5. **Money is sacred** — escrow state is always visible; no hidden fees
6. **Mobile-first for talent** — youth use phones; every form works on 375px
7. **RTL is equal** — Arabic is designed, not translated
8. **Speed** — public gig pages are SSR/cached; profile images via CDN

---

## §11 — Legal & Financial Integrity

1. **CNDP (Law 09-08)**: user PII (phone, CNSS if collected, location) role-gated, encrypted at rest, audit-logged. Support data export + deletion.
2. **Escrow safety**: escrow funds are DB-tracked with a strict state machine (pending → funded → released/refunded/disputed). No money leaves without audit row.
3. **Invoice compliance**: platform invoices for gig completion include ICE of business (if provided), TVA if applicable, sequential number per business per year.
4. **Platform fees**: clearly disclosed at gig acceptance. Never hidden.
5. **Dispute protection**: talent can dispute before payment release. Escrow held during dispute.
6. **KYC (v0.2)**: formal KYC for payouts above threshold — modelled now, enforced later.
7. **No data sold, ever.**

---

## §12 — Definition of Done (v0.1 — 20 items)

- [ ] Auth: signup/login for talent + business + admin; email verification
- [ ] Talent profile: create, edit, skills, portfolio, availability
- [ ] Business profile: create, edit, sector, ICE optional
- [ ] Gig posting: full CRUD, categories, skills, budget, deadline, urgency
- [ ] Gig browsing: public search by skill/category/budget, no login required
- [ ] Proposal system: apply, accept, reject — RBAC enforced
- [ ] AI matching: match score on every proposal; top-5 shown to business on post
- [ ] Messaging: thread per gig application, unlocked after match
- [ ] Escrow: fund on acceptance, release on completion, refund on cancellation
- [ ] Reviews: mutual mandatory post-completion; feeds rating + verification
- [ ] Notifications: in-app for all key events
- [ ] Email: welcome, gig alert digest, payment confirmation (Resend)
- [ ] Admin dashboard: verification queue, escrow health, dispute queue, KPIs
- [ ] Skill verification flow: talent requests → admin approves → badge appears
- [ ] Money stored as integer centimes everywhere; formatted on display
- [ ] Audit log on all financial mutations (escrow fund/release/refund/dispute)
- [ ] French fully translated; Arabic fully translated + RTL correct
- [ ] `pnpm build` passes, zero TS errors; `pnpm test` all green; `pnpm lint` clean
- [ ] Demo seed loads; new user sees populated marketplace
- [ ] Deploy: Vercel + managed Postgres + worker OR `docker compose up -d` end-to-end

---

## §13 — Sprint Roadmap

| Sprint | Goal |
|---|---|
| **Sprint 0** | Scaffold: monorepo, Postgres+Drizzle+RLS, Auth.js (email + Google), Docker, CI — `pnpm dev` works, login works, roles enforced |
| **Sprint 1** | Data model + RBAC + Talent & Business profiles + demo seed |
| **Sprint 2** | Gig marketplace: post, browse (public SSR), apply, accept/reject |
| **Sprint 3** | AI matching engine (pgvector + scoring) + Messaging |
| **Sprint 4** | Payments & Escrow (fund → release → refund → dispute) |
| **Sprint 5** | Reviews, Trust system, Skill verification, Notifications + Email |
| **Sprint 6** | Admin dashboard + i18n FR/AR complete + RTL + a11y |
| **Sprint 7** | Security hardening + performance + deploy → v0.1 ship |

---

## §14 — Repository Structure

```
mahara/
├── CLAUDE.md                          ← this file
├── .claude/                           ← AI team config (skills, sprint backlogs, logs)
├── apps/
│   └── web/                           ← Next.js 15 (public marketplace + auth + dashboard)
│       └── src/app/
│           ├── [locale]/(public)/     ← gig browse, talent profiles (SSR, no auth)
│           ├── [locale]/(talent)/     ← talent dashboard
│           ├── [locale]/(business)/   ← business dashboard
│           ├── [locale]/(admin)/      ← admin dashboard
│           └── api/                   ← route handlers (matching, payments, webhooks)
├── packages/
│   ├── core/                          ← shared TS types, Money helpers, RBAC, Zod schemas
│   ├── db/                            ← Drizzle schema, migrations, RLS, seed
│   ├── matching/                      ← skill embedding + scoring engine
│   ├── payments/                      ← escrow state machine + payment adapter interface
│   ├── notifications/                 ← in-app + email (Resend) alert engine
│   ├── verification/                  ← skill verification workflow
│   └── ocr/                           ← document OCR (portfolio/ID — v0.2, stub now)
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## §15 — Auth & Access Model

- **Auth.js v5** — credentials (email + Argon2id) + Google OAuth
- Session carries `{ userId, role }` — role is read server-side only
- Talent and Business users are **not** tenants of each other — they are separate role-scoped users in a shared schema
- RLS policies scope reads by role: talent sees own profile + public gigs; business sees own gigs + proposals; admin sees all
- Every protected server action runs through `withRole(session, requiredRole, handler)`
- Secrets in `.env` only; gitleaks in CI
