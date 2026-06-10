/**
 * Payment action tests — covers markGigComplete, releaseEscrow, refundEscrow,
 * openDispute, and resolveDispute success + error paths.
 * Builds on top of the existing payments-rbac.test.ts (RBAC-only tests).
 */
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

vi.mock("@mahara/payments", () => ({
  DevGateway: vi.fn().mockImplementation(() => ({
    initiateCharge: vi.fn().mockResolvedValue({ redirectUrl: "https://pay.dev/session-123" }),
  })),
  EscrowStateMachine: vi.fn().mockImplementation(() => ({
    release: vi.fn().mockResolvedValue({ id: "escrow-1", status: "released" }),
    refund: vi.fn().mockResolvedValue({ id: "escrow-1", status: "refunded" }),
    openDispute: vi.fn().mockResolvedValue({ id: "escrow-1", status: "disputed" }),
    resolveDispute: vi.fn().mockResolvedValue({ id: "escrow-1", status: "released" }),
  })),
}));

import {
  markGigComplete,
  openDispute,
  refundEscrow,
  releaseEscrow,
  resolveDispute,
} from "@/app/actions/payments";
import { auth } from "@/lib/auth";

// ── helpers ───────────────────────────────────────────────────────────────────

function asSession(id: string, role: "talent" | "business" | "admin") {
  vi.mocked(auth).mockResolvedValue({
    user: { id, role, name: "Test", email: `${id}@test.ma` },
  } as Session);
}

const GIG_ID = "00000000-0000-0000-0000-000000000001";
const ESCROW_ID = "00000000-0000-0000-0000-000000000002";
const BUSINESS_ID = "business-user-1";
const TALENT_ID = "talent-user-1";

const IN_PROGRESS_GIG = {
  id: GIG_ID,
  status: "in_progress",
  title: "Build landing page",
  businessId: "bp-1",
  business: { id: "bp-1", userId: BUSINESS_ID },
};

const COMPLETED_GIG = { ...IN_PROGRESS_GIG, status: "completed" };

const FUNDED_ESCROW = {
  id: ESCROW_ID,
  gigId: GIG_ID,
  businessId: BUSINESS_ID,
  talentId: TALENT_ID,
  grossAmount: 200000,
  platformFeeFromBusiness: 20000,
  status: "funded",
};

const PENDING_ESCROW = { ...FUNDED_ESCROW, status: "pending" };

function makeSelectCount(count: number) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count }]),
    }),
  };
}

function makeInsert() {
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
  };
}

function makeUpdate() {
  return {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

// ── markGigComplete ───────────────────────────────────────────────────────────

describe("markGigComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession(BUSINESS_ID, "business");
  });

  it("marks gig complete when all conditions met", async () => {
    mockTx = {
      query: {
        gigs: { findFirst: vi.fn().mockResolvedValue(IN_PROGRESS_GIG) },
        escrows: { findFirst: vi.fn().mockResolvedValue(FUNDED_ESCROW) },
      },
      ...makeInsert(),
      ...makeUpdate(),
    };
    const result = await markGigComplete({ gigId: GIG_ID });
    expect(result).toMatchObject({ gigId: GIG_ID, status: "completed" });
  });

  it("throws 404 when gig not found", async () => {
    mockTx = {
      query: { gigs: { findFirst: vi.fn().mockResolvedValue(null) } },
    };
    await expect(markGigComplete({ gigId: GIG_ID })).rejects.toMatchObject({ status: 404 });
  });

  it("throws 403 when requester is not the gig owner", async () => {
    const gigWithOtherBusiness = {
      ...IN_PROGRESS_GIG,
      business: { id: "bp-2", userId: "other-user" },
    };
    mockTx = {
      query: { gigs: { findFirst: vi.fn().mockResolvedValue(gigWithOtherBusiness) } },
    };
    await expect(markGigComplete({ gigId: GIG_ID })).rejects.toMatchObject({ status: 403 });
  });

  it("throws 400 when gig is not in_progress", async () => {
    const draftGig = { ...IN_PROGRESS_GIG, status: "draft" };
    mockTx = {
      query: { gigs: { findFirst: vi.fn().mockResolvedValue(draftGig) } },
    };
    await expect(markGigComplete({ gigId: GIG_ID })).rejects.toMatchObject({ status: 400 });
  });

  it("throws 500 when escrow not found for gig", async () => {
    mockTx = {
      query: {
        gigs: { findFirst: vi.fn().mockResolvedValue(IN_PROGRESS_GIG) },
        escrows: { findFirst: vi.fn().mockResolvedValue(null) },
      },
    };
    await expect(markGigComplete({ gigId: GIG_ID })).rejects.toMatchObject({ status: 500 });
  });

  it("throws 400 when escrow is not funded", async () => {
    mockTx = {
      query: {
        gigs: { findFirst: vi.fn().mockResolvedValue(IN_PROGRESS_GIG) },
        escrows: { findFirst: vi.fn().mockResolvedValue(PENDING_ESCROW) },
      },
    };
    await expect(markGigComplete({ gigId: GIG_ID })).rejects.toMatchObject({ status: 400 });
  });
});

// ── releaseEscrow ─────────────────────────────────────────────────────────────

describe("releaseEscrow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession(BUSINESS_ID, "business");
  });

  it("releases escrow when both reviews are done", async () => {
    mockTx = {
      query: {
        escrows: { findFirst: vi.fn().mockResolvedValue(FUNDED_ESCROW) },
        gigs: {
          findFirst: vi.fn().mockResolvedValue({ ...COMPLETED_GIG, updatedAt: new Date(0) }),
        },
      },
      ...makeSelectCount(2),
      ...makeInsert(),
    };
    const result = await releaseEscrow({ escrowId: ESCROW_ID });
    expect(result).toMatchObject({ status: "released" });
  });

  it("releases escrow when 72h timeout has elapsed (even without reviews)", async () => {
    const oldDate = new Date(Date.now() - 73 * 60 * 60 * 1000);
    mockTx = {
      query: {
        escrows: { findFirst: vi.fn().mockResolvedValue(FUNDED_ESCROW) },
        gigs: {
          findFirst: vi.fn().mockResolvedValue({ ...COMPLETED_GIG, updatedAt: oldDate }),
        },
      },
      ...makeSelectCount(0),
      ...makeInsert(),
    };
    const result = await releaseEscrow({ escrowId: ESCROW_ID });
    expect(result).toMatchObject({ status: "released" });
  });

  it("throws 400 when reviews not done and timeout not elapsed", async () => {
    const recentDate = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
    mockTx = {
      query: {
        escrows: { findFirst: vi.fn().mockResolvedValue(FUNDED_ESCROW) },
        gigs: {
          findFirst: vi.fn().mockResolvedValue({ ...COMPLETED_GIG, updatedAt: recentDate }),
        },
      },
      ...makeSelectCount(1),
    };
    await expect(releaseEscrow({ escrowId: ESCROW_ID })).rejects.toMatchObject({ status: 400 });
  });

  it("throws 404 when escrow not found", async () => {
    mockTx = {
      query: { escrows: { findFirst: vi.fn().mockResolvedValue(null) } },
    };
    await expect(releaseEscrow({ escrowId: ESCROW_ID })).rejects.toMatchObject({ status: 404 });
  });

  it("throws 403 when requester is not the escrow owner", async () => {
    const escrowOtherBusiness = { ...FUNDED_ESCROW, businessId: "other-business" };
    mockTx = {
      query: { escrows: { findFirst: vi.fn().mockResolvedValue(escrowOtherBusiness) } },
    };
    await expect(releaseEscrow({ escrowId: ESCROW_ID })).rejects.toMatchObject({ status: 403 });
  });

  it("throws 400 when escrow status is not funded", async () => {
    mockTx = {
      query: {
        escrows: { findFirst: vi.fn().mockResolvedValue({ ...FUNDED_ESCROW, status: "released" }) },
      },
    };
    await expect(releaseEscrow({ escrowId: ESCROW_ID })).rejects.toMatchObject({ status: 400 });
  });

  it("throws 400 when gig is not yet completed", async () => {
    mockTx = {
      query: {
        escrows: { findFirst: vi.fn().mockResolvedValue(FUNDED_ESCROW) },
        gigs: { findFirst: vi.fn().mockResolvedValue(IN_PROGRESS_GIG) },
      },
    };
    await expect(releaseEscrow({ escrowId: ESCROW_ID })).rejects.toMatchObject({ status: 400 });
  });

  it("throws 500 when gig not found for escrow", async () => {
    mockTx = {
      query: {
        escrows: { findFirst: vi.fn().mockResolvedValue(FUNDED_ESCROW) },
        gigs: { findFirst: vi.fn().mockResolvedValue(null) },
      },
    };
    await expect(releaseEscrow({ escrowId: ESCROW_ID })).rejects.toMatchObject({ status: 500 });
  });
});

// ── refundEscrow ──────────────────────────────────────────────────────────────

describe("refundEscrow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession(BUSINESS_ID, "business");
  });

  it("refunds escrow for in-progress gig", async () => {
    mockTx = {
      query: {
        escrows: { findFirst: vi.fn().mockResolvedValue(FUNDED_ESCROW) },
        gigs: { findFirst: vi.fn().mockResolvedValue(IN_PROGRESS_GIG) },
      },
      ...makeUpdate(),
    };
    const result = await refundEscrow({ escrowId: ESCROW_ID });
    expect(result).toMatchObject({ status: "refunded" });
  });

  it("throws 404 when escrow not found", async () => {
    mockTx = {
      query: { escrows: { findFirst: vi.fn().mockResolvedValue(null) } },
    };
    await expect(refundEscrow({ escrowId: ESCROW_ID })).rejects.toMatchObject({ status: 404 });
  });

  it("throws 403 when not the escrow owner", async () => {
    mockTx = {
      query: {
        escrows: {
          findFirst: vi.fn().mockResolvedValue({ ...FUNDED_ESCROW, businessId: "other" }),
        },
      },
    };
    await expect(refundEscrow({ escrowId: ESCROW_ID })).rejects.toMatchObject({ status: 403 });
  });

  it("throws 400 when gig is completed (refund not allowed)", async () => {
    mockTx = {
      query: {
        escrows: { findFirst: vi.fn().mockResolvedValue(FUNDED_ESCROW) },
        gigs: { findFirst: vi.fn().mockResolvedValue(COMPLETED_GIG) },
      },
    };
    await expect(refundEscrow({ escrowId: ESCROW_ID })).rejects.toMatchObject({ status: 400 });
  });
});

// ── openDispute ───────────────────────────────────────────────────────────────

describe("openDispute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("talent can open a dispute on their escrow", async () => {
    asSession(TALENT_ID, "talent");
    mockTx = {
      query: {
        escrows: { findFirst: vi.fn().mockResolvedValue(FUNDED_ESCROW) },
        gigs: { findFirst: vi.fn().mockResolvedValue(IN_PROGRESS_GIG) },
      },
      ...makeInsert(),
    };
    const result = await openDispute({ escrowId: ESCROW_ID });
    expect(result).toMatchObject({ status: "disputed" });
  });

  it("business can open a dispute on their escrow", async () => {
    asSession(BUSINESS_ID, "business");
    mockTx = {
      query: {
        escrows: { findFirst: vi.fn().mockResolvedValue(FUNDED_ESCROW) },
        gigs: { findFirst: vi.fn().mockResolvedValue(IN_PROGRESS_GIG) },
      },
      ...makeInsert(),
    };
    const result = await openDispute({ escrowId: ESCROW_ID });
    expect(result).toMatchObject({ status: "disputed" });
  });

  it("throws 404 when escrow not found", async () => {
    asSession(TALENT_ID, "talent");
    mockTx = {
      query: { escrows: { findFirst: vi.fn().mockResolvedValue(null) } },
    };
    await expect(openDispute({ escrowId: ESCROW_ID })).rejects.toMatchObject({ status: 404 });
  });

  it("throws 403 when user is not a party to the escrow", async () => {
    asSession("outsider", "talent");
    mockTx = {
      query: { escrows: { findFirst: vi.fn().mockResolvedValue(FUNDED_ESCROW) } },
    };
    await expect(openDispute({ escrowId: ESCROW_ID })).rejects.toMatchObject({ status: 403 });
  });
});

// ── resolveDispute ────────────────────────────────────────────────────────────

describe("resolveDispute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("admin-user", "admin");
  });

  const DISPUTED_ESCROW = { ...FUNDED_ESCROW, status: "disputed" };

  it("resolves dispute with release (payout to talent)", async () => {
    mockTx = {
      query: {
        escrows: { findFirst: vi.fn().mockResolvedValue(DISPUTED_ESCROW) },
        gigs: { findFirst: vi.fn().mockResolvedValue(COMPLETED_GIG) },
      },
      ...makeInsert(),
    };
    const result = await resolveDispute({ escrowId: ESCROW_ID, resolution: "release" });
    expect(result).toMatchObject({ status: "released" });
  });

  it("resolves dispute with refund (payout to business)", async () => {
    mockTx = {
      query: {
        escrows: { findFirst: vi.fn().mockResolvedValue(DISPUTED_ESCROW) },
        gigs: { findFirst: vi.fn().mockResolvedValue(COMPLETED_GIG) },
      },
      ...makeInsert(),
    };
    const result = await resolveDispute({ escrowId: ESCROW_ID, resolution: "refund" });
    expect(result).toBeDefined();
  });

  it("throws 404 when escrow not found", async () => {
    mockTx = {
      query: { escrows: { findFirst: vi.fn().mockResolvedValue(null) } },
    };
    await expect(
      resolveDispute({ escrowId: ESCROW_ID, resolution: "release" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 400 when escrow is not in disputed state", async () => {
    mockTx = {
      query: { escrows: { findFirst: vi.fn().mockResolvedValue(FUNDED_ESCROW) } },
    };
    await expect(
      resolveDispute({ escrowId: ESCROW_ID, resolution: "release" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
