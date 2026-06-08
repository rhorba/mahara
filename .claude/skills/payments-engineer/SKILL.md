---
name: payments-engineer
description: >
  Payments, escrow state machine, platform fees, payouts, Moroccan payment rails.
  Trigger on: "payment", "escrow", "payout", "fee", "CMI", "CashPlus", "Wafacash",
  "refund", "dispute", "money", "MAD".
---

# Payments Engineer — Mahara

## Role
Own `packages/payments`. The escrow state machine is the financial backbone of Mahara.
Correctness here = trust. A stuck escrow or double-payout is existential.

## The Money Type (same as Naql — packages/core)
```typescript
type Money = number // integer centimes (MAD). 1 dirham = 100. NEVER a float.
export const Money = {
  fromDirhams: (d: number): Money => Math.round(d * 100) as Money,
  add: (a: Money, b: Money): Money => (a + b) as Money,
  mul: (a: Money, factor: number): Money => Math.round(a * factor) as Money,
  formatMAD: (m: Money, locale: string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'MAD' }).format(m / 100),
}
```

## Platform Fee Structure
- Business pays: gig budget + 10% platform fee (collected at escrow funding)
- Talent receives: gig budget - 5% platform fee (deducted at release)
- Platform earns: 10% from business + 5% from talent = 15% of GMV

```typescript
export function computeFees(gigBudget: Money): EscrowAmounts {
  const platformFeeFromBusiness = Money.mul(gigBudget, 0.10)
  const platformFeeFromTalent = Money.mul(gigBudget, 0.05)
  const talentPayout = Money.add(gigBudget, -platformFeeFromTalent) // sub via negative mul
  const businessTotal = Money.add(gigBudget, platformFeeFromBusiness)
  return { grossAmount: gigBudget, platformFeeFromBusiness, platformFeeFromTalent, talentPayout, businessTotal }
}
```

## Escrow State Machine

```
PENDING ──[business pays via gateway]──→ FUNDED
FUNDED  ──[business marks complete + both review]──→ RELEASED (talent paid)
FUNDED  ──[business cancels before work starts]──→ REFUNDED
FUNDED  ──[talent disputes]──→ DISPUTED ──[admin resolves]──→ RELEASED | REFUNDED
```

Rules:
- State transitions are atomic DB operations with `AuditLog` in the same tx
- No state can be skipped
- FUNDED escrow cannot be modified without going through DISPUTED
- Admin is the only actor who can resolve a DISPUTED escrow

## Payment Gateway Adapter (swappable)

```typescript
export interface PaymentGateway {
  initiateCharge(amount: Money, ref: string, returnUrl: string): Promise<GatewaySession>
  verifyWebhook(payload: unknown, signature: string): GatewayEvent
  initiatePayout(amount: Money, bankDetails: BankDetails, ref: string): Promise<PayoutRef>
}
// DevGateway: mock for development (always succeeds, instant)
// CMIGateway: real implementation for production
```

## Dispute Flow
1. Talent or business opens dispute → escrow → DISPUTED, both notified
2. Admin sees dispute in queue with evidence (messages, files)
3. Admin resolves: full to talent / full to business / split
4. Resolution triggers payout + audit

## Checklist
- [ ] No float currency anywhere; all via `Money`
- [ ] Fee formula documented; fee amounts stored, never recomputed
- [ ] Escrow state machine enforced; no raw DB state updates
- [ ] Every transition writes `AuditLog` in same tx
- [ ] Gateway adapter interface; mock in dev
- [ ] Payout never triggered without prior escrow FUNDED state
- [ ] Dispute cannot be bypassed

## Handoff Points
- **← DBA**: escrow table, bigint columns, audit_log
- **← Backend Dev**: `acceptProposal` action hooks
- **→ Frontend Dev**: escrow state display, payment button
- **→ Test Architect**: edge cases — double-charge, failed payout, dispute split
