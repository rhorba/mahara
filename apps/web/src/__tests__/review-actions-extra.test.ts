/**
 * Additional review action tests — covers getGigReviews and hasReviewedGig
 * which are at 0% coverage. createReview success paths also extended.
 */
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

// biome-ignore lint/suspicious/noExplicitAny: test-only
let mockTx: any;

vi.mock("@mahara/db", async (importOriginal) => {
  // biome-ignore lint/suspicious/noExplicitAny: test-only
  const actual = await importOriginal<any>();
  return {
    ...actual,
    withUserContext: vi.fn((_u: string, _r: string, fn: (tx: unknown) => unknown) => fn(mockTx)),
  };
});

import { createReview, getGigReviews, hasReviewedGig } from "@/app/actions/review";
import { auth } from "@/lib/auth";

function asSession(id: string, role: "talent" | "business" | "admin") {
  vi.mocked(auth).mockResolvedValue({
    user: { id, role, name: "Test", email: `${id}@test.ma` },
  } as Session);
}

const COMPLETED_GIG = {
  id: "00000000-0000-0000-0000-000000000001",
  status: "completed",
  title: "Design landing page",
  businessId: "bp-1",
};

const ESCROW = {
  id: "escrow-1",
  gigId: "00000000-0000-0000-0000-000000000001",
  businessId: "business-user-1",
  talentId: "talent-user-1",
  grossAmount: 200000,
};

const REVIEW = {
  id: "review-1",
  gigId: "00000000-0000-0000-0000-000000000001",
  rating: 4,
  comment: "Great work",
  reviewerRole: "business",
};

function makeSelectChain(rows: unknown[]) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(rows),
    }),
  };
}

// ── getGigReviews ─────────────────────────────────────────────────────────────

describe("getGigReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("admin-user", "admin");
  });

  it("returns reviews for a gig", async () => {
    mockTx = {
      query: {
        reviews: { findMany: vi.fn().mockResolvedValue([REVIEW]) },
      },
    };
    const result = await getGigReviews({ gigId: "00000000-0000-0000-0000-000000000001" });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ rating: 4 });
  });

  it("returns empty array when no reviews", async () => {
    mockTx = {
      query: { reviews: { findMany: vi.fn().mockResolvedValue([]) } },
    };
    const result = await getGigReviews({ gigId: "00000000-0000-0000-0000-000000000001" });
    expect(result).toHaveLength(0);
  });
});

// ── hasReviewedGig ────────────────────────────────────────────────────────────

describe("hasReviewedGig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { reviewed: true } when review exists", async () => {
    asSession("business-user-1", "business");
    mockTx = {
      query: { reviews: { findFirst: vi.fn().mockResolvedValue(REVIEW) } },
    };
    const result = await hasReviewedGig({ gigId: "00000000-0000-0000-0000-000000000001" });
    expect(result).toEqual({ reviewed: true });
  });

  it("returns { reviewed: false } when no review", async () => {
    asSession("talent-user-1", "talent");
    mockTx = {
      query: { reviews: { findFirst: vi.fn().mockResolvedValue(null) } },
    };
    const result = await hasReviewedGig({ gigId: "00000000-0000-0000-0000-000000000001" });
    expect(result).toEqual({ reviewed: false });
  });
});

// ── createReview (talent reviews business) ────────────────────────────────────

describe("createReview — talent reviews business", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("talent-user-1", "talent");
  });

  it("creates review and notifies reviewee", async () => {
    mockTx = {
      query: {
        gigs: { findFirst: vi.fn().mockResolvedValue(COMPLETED_GIG) },
        escrows: { findFirst: vi.fn().mockResolvedValue(ESCROW) },
        talentProfiles: {
          findFirst: vi.fn().mockResolvedValue({
            id: "tp-1",
            userId: "talent-user-1",
            verificationStatus: "unverified",
          }),
        },
        reviews: { findFirst: vi.fn().mockResolvedValue(null) },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([REVIEW]),
        }),
      }),
      ...makeSelectChain([{ reviewCount: 1, avgRating: "4.0", gigCount: 1 }]),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };

    const result = await createReview({
      gigId: "00000000-0000-0000-0000-000000000001",
      rating: 4,
      comment: "Good work",
    });
    expect(result).toMatchObject({ rating: 4 });
  });

  it("throws 403 when talent is not party to the gig", async () => {
    mockTx = {
      query: {
        gigs: { findFirst: vi.fn().mockResolvedValue(COMPLETED_GIG) },
        escrows: {
          findFirst: vi.fn().mockResolvedValue({ ...ESCROW, talentId: "other-talent" }),
        },
      },
    };
    await expect(
      createReview({
        gigId: "00000000-0000-0000-0000-000000000001",
        rating: 3,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws 404 when gig not found", async () => {
    mockTx = {
      query: { gigs: { findFirst: vi.fn().mockResolvedValue(null) } },
    };
    await expect(
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 4 }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 400 when gig is not completed", async () => {
    mockTx = {
      query: {
        gigs: { findFirst: vi.fn().mockResolvedValue({ ...COMPLETED_GIG, status: "in_progress" }) },
      },
    };
    await expect(
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 4 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 404 when escrow not found", async () => {
    mockTx = {
      query: {
        gigs: { findFirst: vi.fn().mockResolvedValue(COMPLETED_GIG) },
        escrows: { findFirst: vi.fn().mockResolvedValue(null) },
      },
    };
    await expect(
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 4 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── createReview (business reviews talent) ────────────────────────────────────

describe("createReview — business reviews talent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("business-user-1", "business");
  });

  it("creates review and triggers talent stats update", async () => {
    mockTx = {
      query: {
        gigs: { findFirst: vi.fn().mockResolvedValue(COMPLETED_GIG) },
        escrows: { findFirst: vi.fn().mockResolvedValue(ESCROW) },
        talentProfiles: {
          findFirst: vi.fn().mockResolvedValue({
            id: "tp-1",
            userId: "talent-user-1",
            verificationStatus: "unverified",
          }),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...REVIEW, reviewerRole: "business" }]),
        }),
      }),
      ...makeSelectChain([{ reviewCount: 2, avgRating: "4.5", gigCount: 2 }]),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };

    const result = await createReview({
      gigId: "00000000-0000-0000-0000-000000000001",
      rating: 5,
    });
    expect(result).toBeDefined();
    // Talent stats update calls update once (in updateTalentStats)
    expect(mockTx.update).toHaveBeenCalled();
  });

  it("throws 403 when business is not party to the gig", async () => {
    mockTx = {
      query: {
        gigs: { findFirst: vi.fn().mockResolvedValue(COMPLETED_GIG) },
        escrows: {
          findFirst: vi.fn().mockResolvedValue({ ...ESCROW, businessId: "other-business" }),
        },
      },
    };
    await expect(
      createReview({ gigId: "00000000-0000-0000-0000-000000000001", rating: 4 }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
