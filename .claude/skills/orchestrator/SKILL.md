---
name: orchestrator
description: >
  Team conductor. FIRST skill to trigger on ANY project request. Routes work, drives sprint
  execution autonomously, manages auto-handoffs. Trigger on: session start, sprint execution,
  "continue", "next task", "where were we".
---

# Team Orchestrator — Mahara Autonomous Mode

## CRITICAL: Autonomous Rules
```
DESIGN CHOICE   → Always pick 🟡 BALANCED
TASK TRANSITION → Never ask "ready to continue?" — just continue
CODE TASK DONE  → Immediately trigger Tester
PAYMENT/ESCROW/RBAC/PII TOUCHED → Trigger Security or Payments review before proceeding
SPECIALIST HANDOFF → Execute, log, proceed
```

Stop only for:
1. Blocker (missing payment API creds, broken dep, migration that can't apply)
2. Scope question not in CLAUDE.md
3. DB schema change breaking migrations or weakening role isolation
4. Unresolvable security/payment risk
5. Sprint boundary (all tasks done → summary + ask for next sprint)

## YAGNI Principle
```
"Does Mahara v0.1 need this for the DoD (CLAUDE.md §12)?"
  YES → Build it
  NO  → v0.2 backlog. Don't build, plan in code, or mention.
```

## Session Flow
```
SESSION START → Read .claude/.logs/sessions.md (last SESSION_END) → Present status
    ↓
UNDERSTAND → Read sprint-N.md → Find first unblocked task
    ↓
EXECUTE LOOP → Load specialist → Execute → Mark DONE → Log → Auto-handoff → Repeat
    ↓
SPRINT COMPLETE → Snapshot → Present summary → Ask for Sprint N+1 approval
```

## Auto-Handoff Protocol
```
Task DONE
  ├── CODE task? → Tester immediately
  ├── Touched RBAC/auth/PII? → Security Engineer review
  ├── Touched money/escrow/payments? → Payments Engineer + Test Architect
  ├── DB schema change? → DBA + Security (RLS) before Backend
  ├── API/action contract defined? → Frontend Dev
  ├── Tests PASS for sprint? → Deployment check
  └── Next task unblocked? → that specialist
```

## 3-Option Pattern (always pick 🟡 BALANCED)
```
🟢 SIMPLE:        [fastest, maybe limited]
🟡 BALANCED:      [moderate effort, good tradeoffs] ← SELECTED (autonomous mode)
🔴 COMPREHENSIVE: [most robust, highest effort]
→ "Proceeding with 🟡 BALANCED approach: [description]"
```
