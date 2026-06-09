# activity

<!-- append-only log — completed tasks + milestones -->

## 2026-06-03 — Session 1

### S0-01 ✅ pnpm workspace init — Tech Lead
- Created root `package.json` with workspace scripts (dev/build/lint/test/db:*)
- Created `pnpm-workspace.yaml` declaring `apps/*` and `packages/*`
- Created `biome.json` (linter + formatter config, strict no-any)
- Created `tsconfig.base.json` (strict TypeScript, ES2022, NodeNext)
- Created `.gitignore`
- Created `package.json` stubs for: core, db, matching, payments, notifications, verification, apps/web
- Fixed: workspace:* used on non-workspace packages (biome, typescript) → replaced with version pins
- `pnpm install` ran successfully — 388 packages resolved

### S0-02 ✅ Next.js 15 App Router skeleton — Tech Lead
- `apps/web/package.json` with all deps (next 15, next-auth v5 beta, next-intl, react 19, tailwind v4)
- `apps/web/tsconfig.json` (extends base, bundler module resolution, @/* path alias)
- `apps/web/next.config.ts` with next-intl plugin, R2 + Google image domains
- App Router structure: `[locale]/(public)`, `[locale]/(talent)`, `[locale]/(business)`, `[locale]/(admin)`
- `src/i18n/routing.ts` — locales: fr/ar/en, defaultLocale: fr
- `src/i18n/request.ts` — getRequestConfig with dynamic message import
- `src/i18n/navigation.ts` — typed Link, redirect, useRouter
- `src/middleware.ts` — intl routing + protected route auth check
- `src/styles/globals.css` — Tailwind v4 @theme with Mahara design tokens (green #1B4332, gold #D4A017)
- `src/messages/fr.json`, `ar.json`, `en.json` — placeholder translations for home/nav/gigs/auth/errors
- `src/lib/auth.ts` — stub (replaced in S0-07)
- Dashboard pages for talent/business/admin with role-gate redirects

### S0-03 ✅ packages/core — Tech Lead
- `src/types.ts` — Money branded type, Role, SkillLevel, VerificationStatus, GigStatus, EscrowStatus, NotificationType, Session, SkillEntry
- `src/money.ts` — money(), formatMoney(), addMoney(), subtractMoney(), computeFee(), madToCentimes(), centimesToMad()
- `src/rbac.ts` — requireRole(), hasRole(), requireOwnerOrAdmin(), UnauthorizedError, ForbiddenError
- `src/schemas.ts` — Zod schemas for signup, login, talentProfile, businessProfile, gig, proposal, review
- `src/index.ts` — barrel export

## Next session resumes at: S0-04 (DBA — packages/db)

## 2026-06-04 — Session 2

### Native builds unblocked ✅
- Added `pnpm.onlyBuiltDependencies` to root package.json for argon2, esbuild, sharp, @biomejs/biome
- `pnpm install` now builds native modules without interactive prompt

### S0-04 ✅ packages/db — Drizzle config + Postgres+pgvector connection + users table — DBA
- `tsconfig.json` — ESNext/bundler resolution (fixes drizzle-kit CJS import issue)
- `drizzle.config.ts` — points to `src/schema/index.ts`, outputs to `migrations/`
- `src/client.ts` — postgres-js connection (max 10, prepare:false for RLS SET LOCAL)
- `src/schema/users.ts` — users table (id uuid, name, email, emailVerified, image, passwordHash, role enum, city, phone, isActive, timestamps); accounts/sessions/verificationTokens for Auth.js v5
- `src/schema/index.ts` — barrel export
- `src/index.ts` — main barrel (db, Database type, schema, withUserContext)
- `src/seed/index.ts` — Sprint 1 stub
- Added `@types/node` to devDependencies; `pnpm tsc --noEmit` → 0 errors

### S0-05 ✅ RLS foundation — withUserContext helper — DBA
- `src/role-context.ts` — `withUserContext(userId, role, fn)` wraps query in transaction with SET CONFIG for RLS
- ALTER TABLE users ENABLE/FORCE ROW LEVEL SECURITY in migration
- Policies: users_select (self or admin), users_insert (true — signup path), users_update (self or admin)
- No DELETE policy — soft-delete via is_active flag

### S0-06 ✅ DB init SQL — pgvector extension + mahara_app role — DBA
- `migrations/0000_youthful_giant_girl.sql` — prepended with CREATE EXTENSION IF NOT EXISTS vector; DO block creates mahara_app role if not exists
- GRANT table privileges to mahara_app; ALTER DEFAULT PRIVILEGES for future tables
- `.env.example` created at repo root with DATABASE_URL, AUTH_SECRET, R2 vars

## Next session resumes at: S0-07 (Security Engineer — Auth.js v5)

## 2026-06-08 — Session 3 (Sprint 0 completion)

### S0-07 ✅ Auth.js v5 — Security Engineer
- `src/lib/auth.config.ts` — edge-safe config: JWT strategy, callbacks (jwt, session), pages
- `src/lib/auth.ts` — full config: DrizzleAdapter, Google OAuth (profile() with role:"talent"), Credentials (Argon2id verify, isActive check)
- `src/app/api/auth/[...nextauth]/route.ts` — GET/POST handlers
- `src/types/next-auth.d.ts` — Session.user.role + User.role + JWT augmentation
- `src/middleware.ts` — rewrote to use `NextAuth(authConfig).auth` (edge-safe) + next-intl

### S0-08 ✅ withRole() server action factory — Backend Dev
- `src/server/errors.ts` — ActionError class (status + message)
- `src/server/with-role.ts` — withRole() and withRoleNoInput() factories
  Pipeline: auth() → role check → Zod.parse → withUserContext(RLS) → handler
  Role ALWAYS from session — never from client input
- `src/server/index.ts` — barrel export

### S0-09 ✅ Signup/login pages + server actions — Backend Dev + Frontend Dev
- `src/app/actions/auth.ts` — signupAction (argon2 hash, DB insert, signIn), loginAction, signOutAction, googleSignInAction
- `src/components/auth/login-form.tsx` — client component (useActionState, credentials + Google)
- `src/components/auth/signup-form.tsx` — client component (role selector, form fields)
- `src/app/[locale]/auth/login/page.tsx` — login page
- `src/app/[locale]/auth/signup/page.tsx` — signup page (reads ?role= from searchParams)
- `src/app/[locale]/auth/redirect/page.tsx` — post-auth role-based redirect
- `src/app/[locale]/auth/error/page.tsx` — Auth.js error page
- `src/app/[locale]/auth/onboarding/page.tsx` — stub (Google OAuth new-user landing)

### S0-12 ✅ App shell: role-aware navigation — Frontend Dev
- `src/components/nav/logout-button.tsx` — client component (form + signOutAction)
- `src/components/nav/navbar.tsx` — server component (reads session + role, conditional links)
- Updated `src/app/[locale]/layout.tsx` — added <NavBar /> + NavBar import

### S0-13 ✅ Docker Compose — DevOps
- `docker-compose.yml` — postgres (pgvector/pgvector:pg16), web, worker; health checks
- `Dockerfile` — multi-stage (builder + runner); standalone Next.js output via NEXT_OUTPUT=standalone
- `Dockerfile.worker` — runs pg-boss worker from notifications package
- `.dockerignore` — excludes node_modules, .next, .env
- `packages/db/init/00_roles.sql` — Docker init: creates mahara_app LOGIN role for dev
- Updated `apps/web/next.config.ts` — conditional standalone output + outputFileTracingRoot
- Updated `.env.example` — POSTGRES_OWNER_USER/PASSWORD added

### S0-14 ✅ pg-boss worker bootstrap — DevOps
- `packages/notifications/src/worker.ts` — pg-boss start + 3 no-op queues + graceful shutdown
- `packages/notifications/src/queue.ts` — scheduleJob() helper for server actions
- `packages/notifications/src/index.ts` — barrel export

### S0-15 ✅ GitHub Actions CI — DevOps
- `.github/workflows/ci.yml` — postgres service (pgvector:pg16), pnpm setup, lint → migrate → test → build → gitleaks

### S0-16 ✅ Role isolation tests — Tester
- `packages/core/vitest.config.ts` + `src/__tests__/money.test.ts` (12 tests) + `src/__tests__/rbac.test.ts` (11 tests)
- `packages/db/vitest.config.ts` + `src/__tests__/rls.test.ts` (5 integration tests; DB-conditional)
- `apps/web/vitest.config.ts` + `src/server/__tests__/with-role.test.ts` (18 unit tests; mocked)

### S0-17 ✅ Build infrastructure — Tester
- vitest.config.ts created for matching, payments, notifications, verification (passWithNoTests)
- Stub src/index.ts created for matching, payments (escrow.ts, adapter.ts), verification
- `packages/db/src/client.ts` — refactored to Proxy pattern (lazy init; no throw on import)

### S0-18 ✅ Sprint 0 snapshot — Project Monitor (this entry)

## 2026-06-08 — Session 4 (Sprint 1)

### S1-01 + S1-02 ✅ Full schema + pgvector — DBA
- 12 new enum types (skill_level, availability_status, business_size, gig_category, gig_status, proposal_status, escrow_status, verification_method, verification_review_status, notification_type, audit_action)
- 11 new tables: talent_profiles, business_profiles, gigs, proposals, escrows, message_threads, messages, reviews, skill_verifications, notifications, audit_logs
- pgvector columns: talent_profiles.skill_vector(1536), gigs.requirement_vector(1536)
- HNSW indexes on both vector columns (Sprint 3 ready)
- Migration: `0001_sprint1_schema.sql` with all DDL + FK constraints + indexes
- `packages/db/src/schema/`: separate files per entity + `enums.ts` + `relations.ts`
- Drizzle relations defined for all tables (enables `with:` relational queries)
- `_journal.json` updated with migration 0001 entry

### S1-03 ✅ RLS review — Security Engineer
- 11 tables: ENABLE + FORCE ROW LEVEL SECURITY applied
- talent_profiles: public SELECT; INSERT/UPDATE by owner; UPDATE by admin
- business_profiles: same as talent
- gigs: public SELECT for non-draft; business INSERT/UPDATE own; admin all
- proposals: talent sees own; business sees proposals to own gigs; both can UPDATE (withdraw/accept/reject)
- escrows: participants SELECT; business INSERT; admin UPDATE; no DELETE policy (state machine)
- message_threads/messages: participants only; sender validates on insert
- reviews: public SELECT; reviewer INSERT
- skill_verifications: talent sees own; admin manages
- notifications: owner only
- audit_logs: admin SELECT; actor INSERT
- No role elevation vectors found; escrow policies require explicit participant match

### S1-04 ✅ Talent profile server actions — Backend Dev
- `apps/web/src/app/actions/talent-profile.ts`
- upsertTalentProfile (talent role, create or update, userId from session)
- getOwnTalentProfile (talent role, no-input)
- setAvailability (talent role, availability toggle)
- All wrapped in withRole() — role from session, userId from session, RLS active

### S1-05 ✅ Business profile server actions — Backend Dev
- `apps/web/src/app/actions/business-profile.ts`
- upsertBusinessProfile (business role, create or update)
- getOwnBusinessProfile (business role, no-input)

### S1-06 ✅ Talent profile edit page — Frontend Dev
- `apps/web/src/components/profile/talent-profile-form.tsx` (client, useTransition)
- `apps/web/src/app/[locale]/(talent)/profile/page.tsx` (server, auth guard)
- Dynamic skills array with level picker; portfolio URLs; language toggle chips; availability radio; hourly rate (MAD display → centimes on submit)
- Full FR/AR/EN translations wired via useTranslations

### S1-07 ✅ Business profile edit page — Frontend Dev
- `apps/web/src/components/profile/business-profile-form.tsx` (client)
- `apps/web/src/app/[locale]/(business)/profile/page.tsx` (server)
- Company name, sector, size chips, ICE, website fields

### S1-08 ✅ Public talent profile page — Frontend Dev
- `apps/web/src/app/[locale]/(public)/talent/[id]/page.tsx` (SSR, generateMetadata)
- Shows: name, city, verification badge, availability, hourly rate, languages, skills with level + verified checkmark, portfolio links, bio
- Uses Drizzle relational query with `with: { user: true }`

### S1-09 ✅ Demo seed — DBA
- `packages/db/src/seed/index.ts` — idempotent (skips if yasmine@demo.mahara.ma exists)
- 6 talent users + profiles (yasmine top_talent, mehdi verified, karima verified, omar pending, sara unverified, younes verified)
- 3 business users + profiles (hassan, nadia, karim)
- 8 gigs (2 open, 1 urgent+open, 2 in_progress, 2 completed, 1 draft)
- 6 proposals (4 pending + 2 accepted for completed gigs)
- 2 escrows (status: released; with correct fee splits)
- 4 reviews (2 per completed gig, mutual)
- argon2 added to packages/db devDependencies for seed hashing

### S1-10 ✅ FR/AR/EN translations — Content Editor
- Added `profile.talent`, `profile.business`, `profile.skill_levels`, `profile.availability`, `profile.verification`, `profile.business_size` sections to fr.json, ar.json, en.json
- All string keys align with form labels and display values

### S1-11 ✅ RBAC + role isolation tests — Tester
- `apps/web/src/server/__tests__/profile-rbac.test.ts` (12 unit tests)
- upsertTalentProfile: talent passes, business 403, unauthenticated 401, invalid input ZodError, userId from session verified
- upsertBusinessProfile: business passes, talent 403, unauthenticated 401, userId from session verified
- Role isolation invariant: withUserContext called with session.userId — RLS scope guaranteed

### S1-12 ✅ Sprint 1 snapshot — Project Monitor (this entry)

## 2026-06-09 — Session 4 (Sprint 2)

### S2-01 ✅ UX wireframes — gig marketplace flows — UX Designer
- Gig post form flow, public browse, apply modal, proposal management wireframes delivered
- Mobile-first: talent apply flow optimised for 375px, single-tap cover letter

### S2-02 ✅ Gig CRUD server actions — Backend Dev
- `apps/web/src/app/actions/gig.ts`
- createGig (business) — draft status, businessId from DB profile
- updateGig (business) — partial update; draft/open only
- publishGig (business) — draft → open
- closeGig (business) — open → cancelled
- getOwnGigs (business) — all gigs by businessProfile.id

### S2-03 ✅ Proposal server actions — Backend Dev
- `apps/web/src/app/actions/proposal.ts`
- computeFees() — 10% from business, 5% from talent, talentPayout = budget − 5%
- applyToGig (talent) — open gig required; talentProfile from session userId
- withdrawProposal (talent) — own proposals only, pending status required
- getOwnProposals (talent) — with gig.business.user join
- acceptProposal (business) — ATOMIC: accept, bulk-reject others, gig→in_progress, escrow (pending), messageThread, auditLog
- rejectProposal (business) — own gig ownership verified
- getGigProposals (business) — ranked by matchScore desc

### S2-04 ✅ Public gig browse page (SSR) — Frontend Dev
- `apps/web/src/app/[locale]/(public)/gigs/page.tsx`
- `apps/web/src/lib/gig-queries.ts` — listOpenGigs + getPublicGigDetail (db directly, RLS public read)
- Category chips (Link-based), search (GET form), urgent toggle, pagination
- No auth required; RLS filters out draft gigs automatically

### S2-05 ✅ Gig detail + apply button — Frontend Dev
- `apps/web/src/app/[locale]/(public)/gigs/[id]/page.tsx`
- `apps/web/src/components/gigs/apply-button.tsx` — shows modal if talent, login link if anon, nothing if business
- `apps/web/src/components/gigs/apply-modal.tsx` — cover letter + proposed budget + estimated days
- generateMetadata for SEO

### S2-06 ✅ Business gig post form page — Frontend Dev
- `apps/web/src/app/[locale]/(business)/business/gigs/new/page.tsx`
- `apps/web/src/components/gigs/gig-post-form.tsx` — client component; Save draft + Publish buttons
- `apps/web/src/app/[locale]/(business)/business/gigs/page.tsx` — list own gigs with status pills

### S2-07 ✅ Business gig detail + proposals page — Frontend Dev
- `apps/web/src/app/[locale]/(business)/business/gigs/[id]/page.tsx`
- `apps/web/src/components/gigs/proposal-actions.tsx` — BusinessProposalActions + TalentProposalActions
- Per-proposal: match score bar, skills, cover letter preview, accept/reject buttons

### S2-08 ✅ Talent proposals list page — Frontend Dev
- `apps/web/src/app/[locale]/(talent)/talent/proposals/page.tsx`
- Grouped: Accepted (messagerie CTA) → Pending (withdraw) → Historique
- Dashboard links updated for both talent and business

### S2-09 ✅ i18n: gigs namespace — Content Editor
- `apps/web/src/messages/fr.json`, `ar.json`, `en.json` — full `gigs` namespace
- categories, status, post.*, apply.*, proposals.*, badges, escrow_note, match_score

### S2-10 ✅ RBAC + role isolation tests — Tester
- `apps/web/src/server/__tests__/gig-proposal-rbac.test.ts` (35 unit tests)
- createGig/updateGig/publishGig/closeGig/getOwnGigs: talent → 403, unauth → 401
- applyToGig/withdrawProposal/getOwnProposals: business → 403, unauth → 401
- acceptProposal/rejectProposal/getGigProposals: talent → 403, unauth → 401
- Ownership isolation: gig must belong to business (wrong bizProfile → 403)
- acceptProposal: 3 inserts verified (escrow + thread + auditLog in one transaction)
- Cross-role: withUserContext always called with session userId — never client-provided
- Fixed: `escrow` possibly-undefined TS error in proposal.ts (null-guard after .returning())
- pnpm build ✅ zero TS errors | pnpm test ✅ 60/60 (3 suites)

### S2-11 ✅ Sprint 2 snapshot — Project Monitor (this entry)

## 2026-06-09 — Session 5 (Sprint 3)

### S3-01 ✅ DB migration 0002 — DBA
- `packages/db/migrations/0002_sprint3_matching.sql`
- Resized both vector columns 1536→384 (`USING NULL::vector(384)` — safe, no embeddings stored)
- Dropped + recreated HNSW index on talent_profiles.skill_vector (384-dim, vector_cosine_ops)
- New HNSW index on gigs.requirement_vector (384-dim, vector_cosine_ops)
- Drizzle schema files updated: talent-profiles.ts + gigs.ts → vector(384)

### S3-02 ✅ Matching engine package — Matching Engine Engineer
- `packages/matching/src/embed.ts` — deterministic 384-dim FNV-1a trigram hashing; fully offline, no model downloads; similar skill names (React/ReactJS) share trigrams → similar vectors; unit-normalised output
- `packages/matching/src/score.ts` — `computeMatchScore(talent, gig)` → integer 0–100; 40% skill overlap + 30% vector cosine + 20% availability + 10% rating
- `packages/matching/src/queries.ts` — `updateTalentEmbedding`, `updateGigEmbedding`, `getTopTalentForGig` (two-phase: pgvector top-50 → JS re-rank)
- `packages/matching/src/index.ts` — public API barrel export

### S3-03 ✅ Backend wiring — Backend Dev
- `apps/web/src/app/actions/talent-profile.ts` — fire-and-forget `updateTalentEmbedding` after profile save
- `apps/web/src/app/actions/gig.ts` — fire-and-forget `updateGigEmbedding` after publishGig
- `apps/web/src/app/actions/proposal.ts` — real `computeMatchScore` on apply (was hardcoded 0)

### S3-04 ✅ Message CRUD server actions — Backend Dev
- `apps/web/src/app/actions/message.ts`
- `sendMessage` (talent/business) — participant verify + insert + lastMessageAt update
- `getThreadMessages` (talent/business) — participant verify + paginated asc
- `markThreadRead` (talent/business) — bulk readAt for own unread
- `getMyThreads` (talent/business) — all threads with gig + other party + latest message

### S3-05 ✅ Match score UI — Frontend Dev
- `apps/web/src/components/matching/match-score-badge.tsx` — client component; green ≥80%, gold ≥60%, gray <60%; color-coded bar + percentage
- `apps/web/src/components/matching/top-talent-panel.tsx` — server async component; top-5 talent with avatar, verification badge, skill chips, MatchScoreBadge, profile link
- `apps/web/src/app/[locale]/(public)/gigs/[id]/page.tsx` — TopTalentPanel shown to business/admin only
- `apps/web/src/app/[locale]/(business)/business/gigs/[id]/page.tsx` — score bar replaced with MatchScoreBadge

### S3-06 ✅ Messaging UI — Frontend Dev
- `apps/web/src/components/messaging/message-composer.tsx` — textarea + send (Ctrl+Enter), calls sendMessage action, router.refresh()
- `apps/web/src/app/[locale]/(talent)/talent/messages/page.tsx` — thread list with gig + business + latest message
- `apps/web/src/app/[locale]/(talent)/talent/messages/[threadId]/page.tsx` — full message view, participant-gated
- `apps/web/src/app/[locale]/(business)/business/messages/page.tsx` — thread list (business perspective)
- `apps/web/src/app/[locale]/(business)/business/messages/[threadId]/page.tsx` — full message view

### S3-07 ✅ i18n: matching + messaging namespaces — Content Editor
- Added to `gigs` namespace: top_talent_for_gig, top_talent_empty, match_excellent/good/partial, top_talent_invite
- New `messaging` namespace: title, no_threads, thread_with, send_placeholder, send_btn, sending, sent, no_messages, you, view_gig, unread, attach_file

### S3-08 ✅ Worker: gig.alerts.sweep — DevOps
- `packages/notifications/src/worker.ts` — real `gigAlertsSweep()` implementation
- Queries open gigs from last 7 days; loads available talent; skill match (exact/substring); inserts `gig_match` notifications
- pg-boss handler wired: `gig.alerts.sweep` calls `gigAlertsSweep()`

### S3-10 ✅ Matching + messaging tests — Tester
- `packages/matching/src/embed.test.ts` (17 tests): embedSkills 384-dim, determinism, unit norm, empty, order-invariant, trigram similarity; cosineSimilarity known values; computeMatchScore integer range, skill/availability/rating ordering, vector usage
- `apps/web/src/server/__tests__/messaging-rbac.test.ts` (23 tests): unauth → 401; admin → 403; thread-not-found → 404; non-participant → 403; valid talent/business participant → resolves; Zod validation; "no contact before commitment" invariant

### S3-11 ✅ Sprint 3 snapshot — Project Monitor (this entry)

## 2026-06-09 — Session 6 (Sprint 4 + Sprint 5)

### S4-08 ✅ EscrowStatusBanner — Frontend Dev
- `apps/web/src/components/payments/escrow-status-banner.tsx` (client component)
- Status-aware CTAs: Pay Now (pending), Mark Complete + Release (funded/completed), Dispute
- Fee breakdown panel; prop renamed `userRole` (was `role`) to avoid Biome ARIA lint
- All buttons use useTransition + server actions

### S4-09 ✅ Business gig detail + escrow query — Frontend Dev
- `apps/web/src/app/[locale]/(business)/business/gigs/[id]/page.tsx` updated
- Queries escrow for gig; renders EscrowStatusBanner when present

### S4-10 ✅ Business dashboard payment confirmation — Frontend Dev
- Dashboard shows green banner on `?payment=funded`, red on `?payment=failed`

### S4-11 ✅ Talent earnings page — Frontend Dev
- `apps/web/src/app/[locale]/(talent)/talent/earnings/page.tsx`
- Summary cards: total earned (released) + total pending (funded)
- Sections: upcoming payouts + payment history; links from dashboard

### S4-12 ✅ Payments i18n (FR/AR/EN) — Content Editor
- `payments` namespace added to fr.json, ar.json, en.json (~40 keys each)

### S5-01 ✅ Review server actions — Backend Dev
- `apps/web/src/app/actions/review.ts`
- createReview (talent/business): party check via escrow, completed-gig gate, reviewee derived from role (never client input); DB unique constraint (gigId+reviewerId) prevents double reviews
- updateTalentStats: aggregates avg/count from reviews, promotes verificationStatus (verified ≥3 reviews ≥350; top_talent ≥10 ≥450; never demotes)
- getGigReviews, hasReviewedGig

### S5-02 ✅ talentProfile stat update — Backend Dev (bundled in S5-01)
- avgRating stored as Math.round(rawAvg * 100): range 0-500
- verificationStatus promoted in same transaction as review insert; never demoted
- completedGigs recomputed from count of business reviews received

### S5-03 ✅ Skill verification server actions — Backend Dev
- `apps/web/src/app/actions/skill-verification.ts`
- requestSkillVerification (talent): validates skill on profile, rejects duplicate pending/approved
- approveSkillVerification (admin): marks skill.verified=true in JSONB, promotes status to "verified", notifies talent
- rejectSkillVerification (admin), getMyVerifications (talent), getPendingVerifications (admin)

### S5-04 ✅ In-app notifications — Backend Dev
- `packages/notifications/src/inapp.ts` — insertNotification / insertNotifications bulk
- `apps/web/src/app/actions/notification.ts` — getMyNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead

### S5-06 ✅ Email (Resend) — Backend Dev
- `packages/notifications/src/email.ts` — sendWelcomeEmail, sendGigAlertDigest, sendPaymentConfirmation, sendReviewRequest
- Lazy Resend init; fire-and-forget (.catch(() => null)) from server actions; re_placeholder_dev fallback
- Auth action: welcome email after signup
- Worker: emailDigestSweep() added to email.digest pg-boss job

### S5-05 ✅ Verification UI + talent profile page — Frontend Dev
- `apps/web/src/components/trust/verification-request.tsx` — VerificationRequestPanel client component
- `apps/web/src/app/[locale]/(talent)/talent/profile/page.tsx` — queries skillVerifications, renders panel below profile form

### S5-07 ✅ ReviewForm + gig detail wiring — Frontend Dev
- `apps/web/src/components/reviews/review-form.tsx` — star rating (1-5 ★), hover effect, comment, submit
- `apps/web/src/app/[locale]/(public)/gigs/[id]/page.tsx` — party check via escrow, shows ReviewForm or "already reviewed" message for completed gigs

### S5-08 ✅ NotificationBell — Frontend Dev
- `apps/web/src/components/notifications/notification-bell.tsx` — bell icon, unread badge, dropdown, mark-read, mark-all, navigate on click, outside-click close
- `apps/web/src/components/nav/navbar.tsx` — pre-fetches up to 50 notifications server-side; passes to bell

### S5-09 ✅ i18n: reviews/trust/notifications namespaces — Content Editor
- `reviews`, `trust`, `notifications` namespaces added to fr.json, ar.json, en.json

### S5-10 ✅ Sprint 5 tests — Tester
- `apps/web/src/__tests__/reviews.test.ts` (24 tests):
  - Rating math: avgRating 0-500 formula + 6 boundary/rounding cases
  - Verification promotion: 8 tests covering all threshold/no-demotion cases
  - createReview RBAC: admin→403, unauth→401, non-completed gig→400, non-party business→403, non-party talent→403, missing escrow→404, Zod validation
- `apps/web/src/__tests__/notifications.test.ts` (11 tests):
  - getUnreadCount: 0, N, null DB value, 401 unauth
  - markAllNotificationsRead: ok:true, single update call, 401 unauth
  - markNotificationRead: success, already-read early-return, 404 not-found, 401 unauth
- **136/136 tests passing** across 7 test suites | TS errors: 0 | Biome errors: 0

### S5-11 ✅ Sprint 5 snapshot — Project Monitor (this entry)
