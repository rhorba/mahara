# Mahara — Claude Code Team Framework

> Read `../CLAUDE.md` for full business rules, data model, and tech stack.
> This file governs HOW the AI team works.

---

## Autonomous Mode (default)

- **Design choices**: Always pick 🟡 **BALANCED** unless user says otherwise.
- **Specialist handoffs**: Proceed automatically — never ask "ready to continue?"
- **Sprint execution**: Work top-to-bottom without pausing between tasks.
- **Testing**: After ANY code task, auto-invoke Tester — never wait for user.

### When to STOP and ask
Only these five reasons:
1. Genuine **blocker** (missing payment API creds, broken dep, schema can't migrate)
2. **Scope question** not answered in `../CLAUDE.md`
3. **DB schema change** that breaks existing migrations or weakens role isolation
4. **Security/payment risk** that can't be resolved within the team's rules
5. **Sprint boundary** (all tasks done — present summary, ask for Sprint N+1 approval)

---

## Sprint System

Sprint backlogs in `.claude/sprint-backlog/sprint-N.md`.

| Sprint | Goal |
|---|---|
| **Sprint 0** | Scaffold + Auth (email + Google OAuth) + RBAC + RLS — `pnpm dev` + login + role isolation proven |
| **Sprint 1** | Data model + Talent & Business profiles + demo seed |
| **Sprint 2** | Gig marketplace: post, browse (public SSR), apply, accept/reject |
| **Sprint 3** | AI matching engine (pgvector + scoring) + Messaging |
| **Sprint 4** | Payments & Escrow (fund → release → refund → dispute) |
| **Sprint 5** | Reviews, Trust, Skill verification, Notifications + Email |
| **Sprint 6** | Admin dashboard + i18n FR/AR + RTL + a11y |
| **Sprint 7** | Security hardening + performance + deploy → v0.1 ship |

---

## Auto-Handoff Protocol

```
TASK DONE → CHECK sprint backlog → FIND newly unblocked tasks → TRIGGER next specialist
```

| When | Auto-trigger |
|---|---|
| Backend/Frontend task DONE | → Tester |
| DB schema change planned | → DBA review, then Security Engineer before Backend proceeds |
| API/server-action contract defined | → Frontend Dev can start |
| Anything touching money/escrow | → Payments Engineer owns, Test Architect reviews edge cases |
| Anything touching auth, RBAC, PII | → Security Engineer immediate review |
| Matching/scoring work | → Matching Engine Engineer, then Tester with fixtures |
| Tests PASS for sprint | → Deployment: verify docker-compose + worker boot |
| Sprint all-green | → Project Monitor: generate sprint snapshot |

### Handoff note format (log to `.claude/.logs/communications.md`)
```
HANDOFF: [From Specialist] → [To Specialist]
Task: [task]
Context: [1 sentence]
Need: [what next specialist must do]
Constraints: [decisions locked in]
```

---

## Specialist Skills

| Specialist | Load from | Trigger |
|---|---|---|
| Orchestrator | `skills/orchestrator/SKILL.md` | Session start, routing |
| Project Manager | `skills/project-manager/SKILL.md` | Scope, charter, PRD, risk |
| Scrum Master | `skills/scrum-master/SKILL.md` | Sprint planning, backlog |
| Tech Lead | `skills/tech-lead/SKILL.md` | Architecture, ADRs, stack |
| DBA | `skills/dba/SKILL.md` | Schema, migrations, Drizzle, RLS |
| Backend Dev | `skills/backend-dev/SKILL.md` | API routes, server actions, business logic |
| Frontend Dev | `skills/frontend-dev/SKILL.md` | Dashboard + public pages, forms, RTL |
| Mobile Dev | `skills/mobile-dev/SKILL.md` | Responsive mobile-first web (v0.2: native app) |
| Matching Engine | `skills/matching-engine/SKILL.md` | pgvector embeddings, scoring, gig alerts |
| Payments Engineer | `skills/payments-engineer/SKILL.md` | Escrow state machine, payout adapter |
| Tester | `skills/tester/SKILL.md` | Vitest, Playwright |
| Test Architect | `skills/test-architect/SKILL.md` | Test strategy, adversarial, escrow edge cases |
| Security Engineer | `skills/security-engineer/SKILL.md` | Auth, RBAC, PII, OWASP, escrow integrity |
| DevOps/DevSecOps | `skills/devops-devsecops/SKILL.md` | Docker, CI/CD, worker, secrets |
| Deployment | `skills/deployment/SKILL.md` | Vercel + Docker Compose verification |
| UX Designer | `skills/ux-designer/SKILL.md` | Flows, wireframes, mobile-first |
| UI Designer | `skills/ui-designer/SKILL.md` | Design tokens, green/gold palette, RTL |
| Content Editor | `skills/content-editor/SKILL.md` | FR/AR copy, gig categories, trust language |
| Project Monitor | `skills/project-monitor/SKILL.md` | Logs, KPIs, sprint reports |

---

## Log Files (`.claude/.logs/` — append-only)

- `activity.md` — completed tasks, milestones
- `decisions.md` — architecture decisions (ADRs)
- `issues.md` — bugs, blockers
- `risks.md` — risks + mitigations
- `corrections.md` — scope changes
- `communications.md` — specialist handoffs
- `sessions.md` — session start/end snapshots
- `metrics.md` — sprint KPI snapshots

---

## Mahara-Specific Rules (the non-negotiables)

1. **Role isolation first** — every query is scoped to `userId` or `role`. A talent cannot see another talent's private data. A business cannot see proposals to other businesses' gigs. RLS is the backstop.
2. **Money is integer centimes** — never a float, never a JS `number` without the `Money` type. Escrow amounts are immutable once funded. Format only on display.
3. **Role is server-side** — never read role from request body, query, or header. Only from the authenticated session.
4. **Audit all financial mutations** — every escrow state transition (fund/release/refund/dispute) writes an `AuditLog` row in the same transaction.
5. **No contact before commitment** — messaging between talent and business only unlocks AFTER a proposal is accepted. Before that: no email, no phone, no social handle shared.
6. **Escrow state machine is strict** — transitions: pending → funded → released | refunded | disputed. No skipping states. No direct DB edits without audit.
7. **Match scores are computed, not gamed** — the matching engine runs server-side only. No client-side score manipulation. Scores are shown to both parties for transparency.
8. **Reviews are mandatory before release** — payment cannot be released without both parties completing their reviews (or 72h timeout → auto-prompt).
9. **RTL & i18n** — every UI string in fr.json/ar.json; logical Tailwind props (`text-start`, `ms-*`); never hardcode user-facing text.
10. **PII discipline (CNDP)** — phone numbers, bank details, CNE/CNSS if collected: encrypted at rest, role-gated, access-logged. Never in logs, never in error payloads.

---

## YAGNI Gate

```
"Does Mahara v0.1 need this for the DoD (../CLAUDE.md §12)?"
  YES → Build it
  NO  → It's a v0.2 backlog item. Do not build, plan in code, or mention. Log to backlog only.
```

The differentiators are AI matching + skill verification + Morocco-native payments.
Ship the core marketplace first.

## 3-Option Pattern (always pick 🟡 BALANCED)

```
🟢 SIMPLE:        [fastest, maybe limited]
🟡 BALANCED:      [moderate effort, good tradeoffs] ← SELECTED (autonomous mode)
🔴 COMPREHENSIVE: [most robust, highest effort]
→ "Proceeding with 🟡 BALANCED approach: [description]"
```
