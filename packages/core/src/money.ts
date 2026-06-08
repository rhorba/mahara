import type { Money } from "./types.js";

/** Wrap a raw integer centimes value as Money (compile-time only). */
export function money(centimes: number): Money {
  if (!Number.isInteger(centimes)) {
    throw new Error(`Money must be integer centimes, got: ${centimes}`);
  }
  if (centimes < 0) {
    throw new Error(`Money cannot be negative, got: ${centimes}`);
  }
  return centimes as Money;
}

/** Format Money as a human-readable MAD string. */
export function formatMoney(amount: Money, locale = "fr-MA"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

/** Add two Money values. */
export function addMoney(a: Money, b: Money): Money {
  return money(a + b);
}

/** Subtract b from a. Throws if result would be negative. */
export function subtractMoney(a: Money, b: Money): Money {
  if (b > a) throw new Error(`Cannot subtract ${b} from ${a}: result would be negative`);
  return money(a - b);
}

/** Compute platform fee as integer centimes (rounds down). */
export function computeFee(amount: Money, basisPoints: number): Money {
  return money(Math.floor((amount * basisPoints) / 10000));
}

/** MAD to centimes. */
export function madToCentimes(mad: number): Money {
  return money(Math.round(mad * 100));
}

/** Centimes to MAD (for display/serialization only — never store as float). */
export function centimesToMad(amount: Money): number {
  return amount / 100;
}
