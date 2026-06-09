import { computeFee, money, subtractMoney } from "@mahara/core/money";
import type { Money } from "@mahara/core/types";

export type EscrowAmounts = {
  grossAmount: Money;
  platformFeeFromBusiness: Money; // 10% — paid by business on top of budget
  platformFeeFromTalent: Money; // 5%  — deducted from talent payout at release
  talentPayout: Money; // grossAmount - platformFeeFromTalent
  businessTotal: Money; // grossAmount + platformFeeFromBusiness (what business pays)
};

/**
 * Compute all escrow fee amounts from a gig budget.
 * Uses integer basis-point arithmetic — no floats ever touch money.
 *
 * Invariant: businessTotal = grossAmount + platformFeeFromBusiness
 *            talentPayout  = grossAmount - platformFeeFromTalent
 */
export function computeFees(gigBudget: Money): EscrowAmounts {
  const platformFeeFromBusiness = computeFee(gigBudget, 1000); // 10% in bp
  const platformFeeFromTalent = computeFee(gigBudget, 500); // 5% in bp
  const talentPayout = subtractMoney(gigBudget, platformFeeFromTalent);
  const businessTotal = money(gigBudget + platformFeeFromBusiness);
  return {
    grossAmount: gigBudget,
    platformFeeFromBusiness,
    platformFeeFromTalent,
    talentPayout,
    businessTotal,
  };
}
