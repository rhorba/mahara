import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Reset module between tests to clear the in-memory store
let checkRateLimit: typeof import("../rate-limit").checkRateLimit;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("../rate-limit");
  checkRateLimit = mod.checkRateLimit;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows the first request and returns MAX-1 remaining", () => {
    const result = checkRateLimit("1.2.3.4");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("counts successive requests and decrements remaining", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("10.0.0.1");
    const result = checkRateLimit("10.0.0.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks on the 11th request (MAX_ATTEMPTS = 10)", () => {
    for (let i = 0; i < 10; i++) checkRateLimit("10.0.0.2");
    const result = checkRateLimit("10.0.0.2");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns remaining=0 for all subsequent blocked requests", () => {
    for (let i = 0; i < 15; i++) checkRateLimit("10.0.0.3");
    expect(checkRateLimit("10.0.0.3").allowed).toBe(false);
  });

  it("isolates counters per IP", () => {
    for (let i = 0; i < 10; i++) checkRateLimit("192.168.1.1");
    // Different IP — first call should return remaining=9
    const result = checkRateLimit("192.168.1.2");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("resets after the time window expires", () => {
    vi.useFakeTimers();

    for (let i = 0; i < 10; i++) checkRateLimit("172.16.0.1");
    expect(checkRateLimit("172.16.0.1").allowed).toBe(false);

    // Advance past the 15-minute window
    vi.advanceTimersByTime(16 * 60 * 1000);

    const result = checkRateLimit("172.16.0.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("treats 'unknown' as a valid IP key (no crash)", () => {
    expect(() => checkRateLimit("unknown")).not.toThrow();
  });
});
