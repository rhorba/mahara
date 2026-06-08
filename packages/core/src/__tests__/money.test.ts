import { describe, expect, it } from "vitest";
import {
  addMoney,
  centimesToMad,
  computeFee,
  formatMoney,
  madToCentimes,
  money,
  subtractMoney,
} from "../money.js";

describe("money()", () => {
  it("wraps a valid integer centimes value", () => {
    expect(money(0)).toBe(0);
    expect(money(1000)).toBe(1000);
    expect(money(200000)).toBe(200000);
  });

  it("throws on non-integer", () => {
    expect(() => money(10.5)).toThrow("integer");
  });

  it("throws on negative", () => {
    expect(() => money(-1)).toThrow("negative");
  });
});

describe("addMoney()", () => {
  it("sums two money values", () => {
    expect(addMoney(money(1000), money(500))).toBe(1500);
  });
});

describe("subtractMoney()", () => {
  it("subtracts two money values", () => {
    expect(subtractMoney(money(1000), money(300))).toBe(700);
  });

  it("throws when result would be negative", () => {
    expect(() => subtractMoney(money(100), money(200))).toThrow();
  });
});

describe("computeFee()", () => {
  it("computes 10% platform fee from business", () => {
    const budget = money(200000); // 2000 MAD
    expect(computeFee(budget, 1000)).toBe(20000); // 10% = 200 MAD
  });

  it("computes 5% platform fee from talent", () => {
    const budget = money(200000);
    expect(computeFee(budget, 500)).toBe(10000); // 5% = 100 MAD
  });

  it("floors partial centimes (no float)", () => {
    // 1% of 333 centimes = 3.33 → floors to 3
    expect(computeFee(money(333), 100)).toBe(3);
  });
});

describe("madToCentimes() / centimesToMad()", () => {
  it("round-trips integer MAD amounts", () => {
    expect(centimesToMad(madToCentimes(2000))).toBe(2000);
    expect(centimesToMad(madToCentimes(150))).toBe(150);
  });

  it("rounds fractional MAD to nearest centime", () => {
    expect(madToCentimes(10.005)).toBe(1001); // rounds up
  });
});

describe("formatMoney()", () => {
  it("formats centimes as MAD currency", () => {
    const formatted = formatMoney(money(200000));
    // Thousands separator varies by platform (space on Linux, period on Windows for fr-MA)
    expect(formatted).toMatch(/2[.\s  ,]?000/);
    expect(formatted).toContain("MAD");
  });
});
