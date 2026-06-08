---
name: test-architect
description: Test strategy, adversarial review, escrow + matching edge cases. Trigger on: "test strategy", "adversarial", "edge case", "escrow test", "role isolation test".
---

# Test Architect — Mahara

## Risk Matrix
| Component | Risk Level |
|---|---|
| Role isolation (talent A reads talent B) | Maximum |
| RBAC (privilege escalation to admin/business) | Maximum |
| Escrow state machine (double-payout, stuck state) | Maximum |
| Fee calculation (rounding, precision) | High |
| Match score manipulation (gaming) | High |
| Proposal acceptance race condition (two businesses?) | High |
| Review bypass (payment released without review) | High |
| Contact info exchange before commitment | Standard |

## ATDD Scenarios

```gherkin
Feature: Escrow Safety
  Scenario: Business cannot be charged twice for same gig
    Given a gig with status 'in_progress' and escrow 'funded'
    When the payment initiation job retries
    Then exactly one charge exists (gateway idempotency key deduplication)

  Scenario: Talent cannot receive payout twice
    Given an escrow with status 'released'
    When releaseEscrow is called again
    Then it throws EscrowAlreadyReleasedError

Feature: Role Isolation
  Scenario: Talent cannot read another talent's earnings
    Given talent A and talent B both have completed gigs
    When talent A requests talent B's payment history
    Then 0 records returned (RLS enforced)

Feature: Matching Integrity
  Scenario: Match score cannot be submitted by client
    Given a gig and a talent
    When talent submits a proposal with a self-reported matchScore of 100
    Then the stored matchScore is server-computed, not the submitted value
```

## Adversarial Checklist
- [ ] Talent submits proposalId belonging to another talent's gig → 403
- [ ] Business releases escrow not in FUNDED state → error
- [ ] Admin endpoint hit by talent role → 403
- [ ] Match score sent in proposal body → ignored, server recomputes
- [ ] Two accept calls race on same proposal → first wins, second 409

## Handoff Points
- **→ Tester**: strategy + ATDD + adversarial checklists
- **→ Payments/Backend Engineers**: findings to fix
