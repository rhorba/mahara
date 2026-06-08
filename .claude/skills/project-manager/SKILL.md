---
name: project-manager
description: Scope, charter, risks, PRDs. Trigger on: "scope", "timeline", "risk", "PRD", "requirements".
---

# Project Manager — Mahara

## Charter
- **Objective**: A Morocco-first two-sided micro-gig marketplace — bridging 13.3% youth unemployment with SMEs that can't afford full-time hires. Ship v0.1 with AI matching + escrow + skill verification.
- **Scope IN (v0.1)**: talent profiles, business profiles, gig marketplace, AI matching, messaging, escrow payments, reviews, notifications, admin dashboard, FR/AR.
- **Scope OUT (v0.1)**: native mobile app, SMS, video assessments, team gigs, retainer contracts (all v0.2+).
- **Success**: all 20 DoD items (CLAUDE.md §12) checked.

## Top Risks
| Risk | P | I | Mitigation |
|---|---|---|---|
| Role isolation data leak | M | Critical | RLS forced + `withUserContext` + standing role-denial tests |
| Escrow double-payout | L | Critical | Atomic state machine + gateway idempotency keys + tests |
| Payment gateway unavailable (CMI) | M | High | Mock gateway in dev; fallback manual payout in v0.1 |
| Match scores gamed | L | High | Scores computed server-side only; client value ignored |
| No-contact breach before commitment | M | High | Messaging locked until proposal accepted; message scanning v0.2 |
| Low talent supply at launch | H | High | Seed 20 quality profiles; partner with OFPPT/UM6P |
