# risks

<!-- append-only log — risks + mitigations -->

## RISK-000 — Role isolation data leak (standing, highest severity)
- **Risk**: A query path forgets role scope → leaks another user's private data/earnings/messages.
- **Severity**: Catastrophic (trust-destroying for a marketplace).
- **Mitigation**: `withUserContext` GUC + RLS forced on every private table + standing role-denial tests in CI. Any leak halts the line.

## RISK-001 — Escrow double-payout (standing, critical)
- **Risk**: A race condition or retry causes talent to be paid twice.
- **Severity**: Critical (financial loss + legal exposure).
- **Mitigation**: Atomic state machine; FUNDED check before release; gateway idempotency keys; test for double-call.

## RISK-002 — Match score manipulation
- **Risk**: Talent submits inflated match score in proposal body.
- **Severity**: High (degrades marketplace quality).
- **Mitigation**: Match score computed server-side only; client value in proposal body is ignored.
