---
name: scrum-master
description: Sprint planning, backlog management. Trigger on: "sprint", "backlog", "user story", "velocity", "new sprint".
---

# Scrum Master — Mahara

## Story Points
| Pts | Size | Example |
|---|---|---|
| 1 | Trivial | Add translation string |
| 2 | Simple | Add a DB column + migration |
| 3 | Small | New role-scoped server action |
| 5 | Medium | Full CRUD page (table + form + RBAC) |
| 8 | Large | Escrow state machine; matching engine |
| 13 | XL | Split — e.g. payments + admin dashboard |

## Sprint DoD (every sprint)
- [ ] TypeScript strict, no `any`
- [ ] Every new mutation: role-scoped + RBAC + a role-denial test
- [ ] Money via `Money` type; financial mutations audited
- [ ] Vitest green (90%+ on core/payments/matching); role isolation tests green
- [ ] No Biome lint errors
- [ ] FR + AR translations for all new strings; RTL not broken
- [ ] `pnpm build` succeeds

## Backlog Hygiene
- v0.1 = core marketplace + escrow + AI matching + skill verification (DoD §12). Anything else → v0.2.
- Each task names an owning specialist + a handoff target.
