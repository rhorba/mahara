import { createReview } from "@/app/actions/review";
import { auth } from "@/lib/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock auth (never touches Next.js headers) ─────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

// ── Mock @mahara/db — keep table objects, replace withUserContext ─────────────
// biome-ignore lint/suspicious/noExplicitAny: test-only mock types
let currentMockTx: any;

vi.mock("@mahara/db", async (importOriginal) => {
  // biome-ignore lint/suspicious/noExplicitAny: test-only
  const actual = await importOriginal<any>();
  return {
    ...actual,
    withUserContext: vi.fn((_u: string, _r: string, fn: (tx: unknown) => unknown) =>
      fn(currentMockTx),
    ),
  };
});

// ── Session helpers ───────────────────────────────────────────────────────────

function asSession(id: string, role: "talent" | "business" | "admin") {
  vi.mocked(auth).mockResolvedValue({
    user: { id, role, name: "Test User", email: `${id}@test.ma` },
    // biome-ignore lint/suspicious/noExplicitAny: minimal session shape
  } as any);
}

function noSession() {
  // biome-ignore lint/suspicious/noExplicitAny: Auth.js overloads require cast for null
  vi.mocked(auth).mockResolvedValue(null as any);
}

// ── Mock tx factory ───────────────────────────────────────────────────────────
// Build a mock Drizzle tx that returns controlled values per test.

function makeMockTx(
  options: {
    gig?: { id: string; status: string; title: string } | null;
    escrow?: { businessId: string; talentId: string } | null;
    insertReturning?: { id: string; rating: number }[];
  } = {},
) {
  const gig = options.gig ?? null;
  const escrow = options.escrow ?? null;
  const insertReturning = options.insertReturning ?? [{ id: "review-1", rating: 4 }];

  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ reviewCount: 0, avgRating: null, gigCount: 0 }]),
  };

  return {
    query: {
      gigs: { findFirst: vi.fn().mockResolvedValue(gig) },
      escrows: { findFirst: vi.fn().mockResolvedValue(escrow) },
      talentProfiles: {
        findFirst: vi.fn().mockResolvedValue({ id: "tp-1", verificationStatus: "unverified" }),
      },
    },
    select: vi.fn().mockReturnValue(selectChain),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(insertReturning),
      }),
    }),
  };
}

// ── 1. Rating math — pure computation tests ──────────────────────────────────
// These tests validate the formula used in updateTalentStats without any DB.
// avgRating is stored as Math.round(rawDbAvg * 100), range 0-500.

describe("talentProfile avgRating storage formula", () => {
  const store = (raw: number) => Math.round(raw * 100);

  it("perfect 5★ → stored as 500", () => {
    expect(store(5.0)).toBe(500);
  });

  it("1★ → stored as 100", () => {
    expect(store(1.0)).toBe(100);
  });

  it("3.75★ → stored as 375", () => {
    expect(store(3.75)).toBe(375);
  });

  it("3.5★ (verified threshold) → 350 exactly", () => {
    expect(store(3.5)).toBe(350);
  });

  it("4.5★ (top_talent threshold) → 450 exactly", () => {
    expect(store(4.5)).toBe(450);
  });

  it("fractional rounding: 4.555★ → 456 (not 455)", () => {
    expect(store(4.555)).toBe(456);
  });
});

// ── 2. Verification status promotion logic ────────────────────────────────────
// Mirrors the threshold logic in updateTalentStats:
//   verified:   reviewCount ≥ 3 AND avgRating ≥ 350
//   top_talent: reviewCount ≥ 10 AND avgRating ≥ 450
//   Never demote.

function computeStatus(current: string, reviewCount: number, avgRating: number): string {
  if (current === "top_talent") return current;
  if (reviewCount >= 10 && avgRating >= 450) return "top_talent";
  if (current !== "verified" && reviewCount >= 3 && avgRating >= 350) return "verified";
  return current;
}

describe("verification status promotion", () => {
  it("unverified → verified at 3 reviews, avgRating 350", () => {
    expect(computeStatus("unverified", 3, 350)).toBe("verified");
  });

  it("unverified → verified above threshold", () => {
    expect(computeStatus("unverified", 5, 400)).toBe("verified");
  });

  it("verified → top_talent at 10 reviews, avgRating 450", () => {
    expect(computeStatus("verified", 10, 450)).toBe("top_talent");
  });

  it("top_talent stays top_talent regardless of stats", () => {
    expect(computeStatus("top_talent", 1, 100)).toBe("top_talent");
    expect(computeStatus("top_talent", 50, 500)).toBe("top_talent");
  });

  it("verified stays verified even if avg drops below threshold", () => {
    expect(computeStatus("verified", 3, 200)).toBe("verified");
  });

  it("unverified stays unverified below review count threshold", () => {
    expect(computeStatus("unverified", 2, 500)).toBe("unverified");
  });

  it("unverified stays unverified below rating threshold", () => {
    expect(computeStatus("unverified", 10, 349)).toBe("unverified");
  });

  it("does not jump to top_talent without meeting both criteria", () => {
    expect(computeStatus("verified", 10, 449)).toBe("verified");
    expect(computeStatus("verified", 9, 450)).toBe("verified");
  });
});

// ── 3. createReview RBAC — mocked pipeline ────────────────────────────────────

describe("createReview — authentication and authorization", () => {
  beforeEach(() => {
    currentMockTx = makeMockTx();
  });

  it("throws 401 when unauthenticated", async () => {
    noSession();
    await expect(
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 4 }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("throws 403 when role is admin (not allowed to review)", async () => {
    asSession("admin-1", "admin");
    await expect(
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 4 }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("createReview — gig status validation", () => {
  beforeEach(() => {
    currentMockTx = makeMockTx({
      gig: { id: "gig-1", status: "open", title: "Design website" },
    });
  });

  it("throws 400 when gig status is open (not completed)", async () => {
    asSession("biz-1", "business");
    await expect(
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 3 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 400 when gig status is in_progress", async () => {
    asSession("biz-1", "business");
    currentMockTx = makeMockTx({
      gig: { id: "gig-1", status: "in_progress", title: "Design website" },
    });
    await expect(
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 3 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 404 when gig does not exist", async () => {
    asSession("biz-1", "business");
    currentMockTx = makeMockTx({ gig: null });
    await expect(
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 3 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("createReview — party check (escrow membership)", () => {
  const completedGig = { id: "gig-1", status: "completed", title: "Design website" };
  const escrow = { businessId: "biz-user-1", talentId: "talent-user-1" };

  it("throws 403 when business user is not the escrow businessId", async () => {
    asSession("biz-user-WRONG", "business");
    currentMockTx = makeMockTx({ gig: completedGig, escrow });
    await expect(
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 5 }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws 403 when talent user is not the escrow talentId", async () => {
    asSession("talent-user-WRONG", "talent");
    currentMockTx = makeMockTx({ gig: completedGig, escrow });
    await expect(
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 5 }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws 404 when escrow is not found for gig", async () => {
    asSession("biz-user-1", "business");
    currentMockTx = makeMockTx({ gig: completedGig, escrow: null });
    await expect(
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 5 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("createReview — input validation", () => {
  it("rejects rating below 1 (Zod)", async () => {
    asSession("biz-user-1", "business");
    currentMockTx = makeMockTx();
    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: intentional bad input
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 0 } as any),
    ).rejects.toThrow();
  });

  it("rejects rating above 5 (Zod)", async () => {
    asSession("biz-user-1", "business");
    currentMockTx = makeMockTx();
    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: intentional bad input
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 6 } as any),
    ).rejects.toThrow();
  });
});
