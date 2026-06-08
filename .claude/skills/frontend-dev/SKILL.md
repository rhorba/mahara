---
name: frontend-dev
description: >
  Frontend: Next.js 15 pages — public marketplace, talent dashboard, business dashboard,
  admin. Mobile-first, RTL, next-intl. Trigger on: "component", "page", "dashboard",
  "table", "form", "UI", "RTL", "i18n", or any web interface work.
---

# Frontend Developer — Mahara

## Role
Build the public marketplace (SSR) and authenticated dashboards. Public pages are editorial
and conversion-focused. Dashboards are data-first and operational.

## Page Architecture

```
Public (no auth, SSR):
  / (landing)       → value prop, stats from HCP, CTA sign up
  /gigs             → browse marketplace (paginated, filterable by skill/category/budget)
  /gigs/[id]        → gig detail + top matched talent (if logged in: apply button)
  /talent/[id]      → public talent profile + portfolio + reviews

Talent Dashboard (/[locale]/talent/):
  /dashboard        → active gigs, earnings, pending reviews, gig alerts
  /profile          → edit profile, skills, portfolio
  /gigs             → browse + apply
  /proposals        → my proposals (status, match score)
  /messages         → threads (post-acceptance only)
  /earnings         → payment history, upcoming payout

Business Dashboard (/[locale]/business/):
  /dashboard        → active gigs, spend, pending reviews
  /gigs             → my gigs list
  /gigs/new         → post gig form
  /gigs/[id]        → gig detail + proposals + match scores
  /messages         → threads
  /payments         → escrow status, payment history

Admin Dashboard (/[locale]/admin/):
  /dashboard        → KPIs (GMV, active gigs, completion rate, new signups)
  /verifications    → skill verification queue
  /disputes         → dispute resolution queue
  /escrow           → escrow health monitor
  /users            → user management
```

## Key Patterns

### Money display (never float)
```tsx
import { Money } from '@mahara/core'
// Always: formatMAD(value, locale) — never raw value
<span>{Money.formatMAD(gig.budget, locale)}</span>
```

### Match score badge
```tsx
// Prominent on proposal cards — builds trust for both sides
<MatchScoreBadge score={proposal.matchScore} />
// 80-100: green "Excellent match"
// 60-79: amber "Good match"
// <60: gray "Partial match"
```

### RTL (MANDATORY)
```tsx
<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
// Logical Tailwind only:
text-start · ms-* · me-* · ps-* · pe-* · border-s · border-e
```

### Mobile-first
Talent users are on phones. All forms work at 375px. Tap targets ≥ 44px.
Test every new page at 375px, 768px, 1280px.

## Handoff Points
- **← Backend Dev**: server-action signatures + response shapes
- **← UX Designer**: wireframes / flows
- **← UI Designer**: design tokens
- **← Matching Engine**: match score display contract
- **→ Tester**: components + critical-path E2E
