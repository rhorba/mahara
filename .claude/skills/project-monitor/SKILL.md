---
name: project-monitor
description: Project monitoring, logging, sprint reports. AUTO-TRIGGERED at task completion + sprint end. Also on "status", "metrics", "retro".
---

# Project Monitor — Mahara

## Log Files (`.claude/.logs/`)
activity.md | decisions.md | issues.md | risks.md | corrections.md | communications.md | sessions.md | metrics.md

## Session Resumption
Read LAST `SESSION_END` from sessions.md:
```
Last session ([date]):
  Completed: [tasks]
  In progress: [task — step X]
  Blocked: [blocker or "none"]
  Next: [task ID]
Continuing from here...
```

## Sprint Snapshot
```markdown
### [date] SPRINT_SNAPSHOT — Sprint N
- Planned: N | Completed: N | Blocked: N
- Tests: [unit] / [E2E]
- Role isolation tests: PASS/FAIL
- Escrow state machine tests: PASS/FAIL
- DoD items: N/20
- Security review: [done/pending] for auth/RBAC/payment touches this sprint
```
