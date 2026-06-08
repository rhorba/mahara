---
name: tester
description: >
  QA and testing. AUTO-TRIGGERED after every code task. Vitest (unit/integration),
  Playwright (web E2E). Trigger on: "test", "vitest", "playwright", "QA", or after any code task.
---

# Tester — Mahara

## AUTO-TRIGGER RULE
```
ANY code task DONE → Tester runs immediately → no confirmation
ALL PASS → log → trigger next task
FAILURES → fix (≤2 attempts) → still failing → BLOCKER → ask user
```

## The Tests That Matter Most

### 1. Role Isolation (CRITICAL)
```typescript
test('talent A cannot read talent B messages', async () => {
  const [a, b] = await seedTalents(2)
  await asUser(b, async () => {
    const msgs = await getMessages(a.threadId)
    expect(msgs).toHaveLength(0)
  })
})
test('business cannot see proposals to another business gig', async () => {
  const [biz1, biz2] = await seedBusinesses(2)
  const gig = await createGig(biz1)
  const proposal = await applyToGig(seedTalent(), gig)
  await asUser(biz2, async () => {
    await expect(getProposals(gig.id)).rejects.toMatchObject({ status: 403 })
  })
})
```

### 2. Escrow State Machine
```typescript
test('escrow cannot skip from pending to released', async () => {
  const escrow = await createEscrow({ status: 'pending' })
  await expect(releaseEscrow(escrow.id)).rejects.toThrow()
})
test('double-payout is impossible', async () => {
  const escrow = await fundAndReleaseEscrow()
  await expect(releaseEscrow(escrow.id)).rejects.toThrow()
})
test('fees sum correctly', () => {
  const budget = Money.fromDirhams(2000)  // 200000 centimes
  const fees = computeFees(budget)
  expect(fees.platformFeeFromBusiness).toBe(20000)  // 10%
  expect(fees.platformFeeFromTalent).toBe(10000)    // 5%
  expect(fees.talentPayout).toBe(190000)            // budget - 5%
})
```

### 3. RBAC Denial
```typescript
test('talent cannot post a gig', async () => {
  await expect(postGig.call(talentSession, gigInput)).rejects.toMatchObject({ status: 403 })
})
test('business cannot apply to gig', async () => {
  await expect(applyToGig.call(businessSession, proposalInput)).rejects.toMatchObject({ status: 403 })
})
```

### 4. Matching Score
```typescript
test('match score is deterministic', () => {
  const score1 = computeMatchScore(talent, gig, 0.85)
  const score2 = computeMatchScore(talent, gig, 0.85)
  expect(score1).toBe(score2)
})
test('unavailable talent scores 0 availability points', () => {
  const score = computeMatchScore({ ...talent, availability: 'unavailable' }, gig, 0.9)
  expect(score).toBeLessThan(computeMatchScore(talent, gig, 0.9))
})
```

### 5. E2E Critical Paths (Playwright)
- signup talent → complete profile → browse gigs → apply
- signup business → post gig → see matched talent → accept proposal
- business funds escrow → messaging unlocked → mark complete → review → payment released
- RTL: `/ar` → `dir=rtl`, forms mirror, currency right-aligned

## Coverage Targets
| Area | Target |
|---|---|
| `packages/core`, `packages/payments`, `packages/matching` | 90%+ |
| Role isolation + RBAC | 100% of mutations have a denial test |
| Escrow state transitions | 100% |
| API/server actions | 80%+ |

## Handoff Points
- **← all code tasks**: auto-triggered
- **→ Backend/Frontend**: bug reports with file:line
- **→ Project Monitor**: results for sprint metrics
- **→ Deployment**: green light when all pass
