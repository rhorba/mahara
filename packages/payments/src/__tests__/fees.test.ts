import { money } from "@mahara/core/money";
import { describe, expect, it } from "vitest";
import { computeFees } from "../fees.js";

describe("computeFees()", () => {
  it("computes correct fees for 2000 MAD budget", () => {
    const budget = money(200000); // 2000 MAD = 200_000 centimes
    const fees = computeFees(budget);

    expect(fees.grossAmount).toBe(200000);
    expect(fees.platformFeeFromBusiness).toBe(20000); // 10% = 200 MAD
    expect(fees.platformFeeFromTalent).toBe(10000); // 5% = 100 MAD
    expect(fees.talentPayout).toBe(190000); // 2000 - 100 = 1900 MAD
    expect(fees.businessTotal).toBe(220000); // 2000 + 200 = 2200 MAD
  });

  it("computes correct fees for 500 MAD budget", () => {
    const budget = money(50000); // 500 MAD
    const fees = computeFees(budget);

    expect(fees.platformFeeFromBusiness).toBe(5000); // 50 MAD
    expect(fees.platformFeeFromTalent).toBe(2500); // 25 MAD
    expect(fees.talentPayout).toBe(47500); // 475 MAD
    expect(fees.businessTotal).toBe(55000); // 550 MAD
  });

  it("invariant: talentPayout + platformFeeFromTalent = grossAmount", () => {
    const budget = money(150000);
    const fees = computeFees(budget);
    expect(fees.talentPayout + fees.platformFeeFromTalent).toBe(fees.grossAmount);
  });

  it("invariant: businessTotal - platformFeeFromBusiness = grossAmount", () => {
    const budget = money(300000);
    const fees = computeFees(budget);
    expect(fees.businessTotal - fees.platformFeeFromBusiness).toBe(fees.grossAmount);
  });

  it("floors fractional centimes — no float arithmetic", () => {
    // 333 centimes budget: 10% = 33.3 → floors to 33
    const budget = money(333);
    const fees = computeFees(budget);
    expect(Number.isInteger(fees.platformFeeFromBusiness)).toBe(true);
    expect(Number.isInteger(fees.platformFeeFromTalent)).toBe(true);
    expect(fees.platformFeeFromBusiness).toBe(33);
    expect(fees.platformFeeFromTalent).toBe(16); // floor(333 * 500 / 10000) = floor(16.65) = 16
  });

  it("returns all-zero fees for 0 budget", () => {
    const budget = money(0);
    const fees = computeFees(budget);
    expect(fees.platformFeeFromBusiness).toBe(0);
    expect(fees.platformFeeFromTalent).toBe(0);
    expect(fees.talentPayout).toBe(0);
    expect(fees.businessTotal).toBe(0);
  });

  it("platform earns 15% of GMV (10% from business + 5% from talent)", () => {
    const budget = money(100000); // 1000 MAD
    const fees = computeFees(budget);
    const platformEarnings = fees.platformFeeFromBusiness + fees.platformFeeFromTalent;
    // 10% + 5% = 15% of 100000 = 15000 centimes
    expect(platformEarnings).toBe(15000);
  });
});
