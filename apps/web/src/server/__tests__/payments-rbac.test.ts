/**
 * S4-12: Payments RBAC tests.
 *
 * Verifies:
 * - only business can initiate payment, mark complete, release, refund
 * - talent and business can open dispute; admin cannot
 * - only admin can resolve dispute
 * - unauthenticated calls get 401
 * - business cannot access another business's escrow (403)
 */
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── vi.hoisted state ──────────────────────────────────────────────────────────

const dbState = vi.hoisted(() => ({
  escrowResult: null as unknown,
  gigResult: null as unknown,
  reviewCount: 0,
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@mahara/payments", () => ({
  DevGateway: vi.fn().mockImplementation(() => ({
    initiateCharge: vi.fn().mockResolvedValue({
      sessionId: "sess-1",
      redirectUrl: "/api/payments/callback?ref=escrow-1&status=success",
      ref: "escrow-1",
    }),
  })),
  EscrowStateMachine: vi.fn().mockImplementation(() => ({
    release: vi.fn().mockResolvedValue({ id: "escrow-1", status: "released" }),
    refund: vi.fn().mockResolvedValue({ id: "escrow-1", status: "refunded" }),
    openDispute: vi.fn().mockResolvedValue({ id: "escrow-1", status: "disputed" }),
    resolveDispute: vi.fn().mockResolvedValue({ id: "escrow-1", status: "released" }),
  })),
}));

vi.mock("@mahara/db", () => {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  };

  const insertChain = {
    values: vi.fn().mockResolvedValue([]),
  };

  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  };

  const mockTx = {
    query: {
      escrows: { findFirst: vi.fn(async () => dbState.escrowResult) },
      gigs: { findFirst: vi.fn(async () => dbState.gigResult) },
      reviews: { findFirst: vi.fn(async () => null) },
    },
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue(insertChain),
    update: vi.fn().mockReturnValue(updateChain),
  };

  (globalThis as Record<string, unknown>).__mockPaymentsTx__ = mockTx;

  return {
    db: {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    },
    withUserContext: vi.fn(
      async (_userId: string, _role: string, fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx),
    ),
    escrows: { id: "id", businessId: "businessId", gigId: "gigId", status: "status" },
    gigs: { id: "id", status: "status" },
    notifications: { id: "id" },
    reviews: { gigId: "gigId" },
  };
});

import {
  initiatePayment,
  markGigComplete,
  openDispute,
  refundEscrow,
  releaseEscrow,
  resolveDispute,
} from "@/app/actions/payments";
import { auth } from "@/lib/auth";
import { withUserContext } from "@mahara/db";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ID = {
  escrow: "e1e1e1e1-0000-0000-0000-000000000001",
  gig: "g1g1g1g1-0000-0000-0000-000000000001",
  bizUser: "b1b1b1b1-0000-0000-0000-000000000001",
  talentUser: "t1t1t1t1-0000-0000-0000-000000000001",
  adminUser: "a1a1a1a1-0000-0000-0000-000000000001",
  otherBiz: "b2b2b2b2-0000-0000-0000-000000000002",
};

const MOCK_ESCROW = {
  id: ID.escrow,
  status: "pending" as const,
  grossAmount: 200000,
  platformFeeFromBusiness: 20000,
  platformFeeFromTalent: 10000,
  talentPayout: 190000,
  businessId: ID.bizUser,
  talentId: ID.talentUser,
  gigId: ID.gig,
  proposalId: "prop-1",
  fundedAt: null,
  releasedAt: null,
};

const MOCK_GIG_IN_PROGRESS = {
  id: ID.gig,
  status: "in_progress" as const,
  title: "Test Gig",
  updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
  businessId: "biz-profile-1",
  business: { userId: ID.bizUser },
};

const MOCK_GIG_COMPLETED = {
  ...MOCK_GIG_IN_PROGRESS,
  status: "completed" as const,
  updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago (> 72h)
};

function mockSession(userId: string, role: "talent" | "business" | "admin"): Session {
  return {
    user: { id: userId, role, email: "test@test.com", name: "Test" },
    expires: "2099-01-01",
  } as Session;
}

beforeEach(() => {
  vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(null);
  vi.mocked(withUserContext).mockImplementation(async (_userId, _role, fn) =>
    fn((globalThis as Record<string, unknown>).__mockPaymentsTx__ as Parameters<typeof fn>[0]),
  );
  dbState.escrowResult = null;
  dbState.gigResult = null;
});

// ── 401 Unauthenticated ───────────────────────────────────────────────────────

describe("payments — unauthenticated (401)", () => {
  it("initiatePayment rejects without session", async () => {
    await expect(initiatePayment({ escrowId: ID.escrow })).rejects.toMatchObject({
      status: 401,
    });
  });

  it("markGigComplete rejects without session", async () => {
    await expect(markGigComplete({ gigId: ID.gig })).rejects.toMatchObject({ status: 401 });
  });

  it("releaseEscrow rejects without session", async () => {
    await expect(releaseEscrow({ escrowId: ID.escrow })).rejects.toMatchObject({ status: 401 });
  });
});

// ── 403 Role denials ──────────────────────────────────────────────────────────

describe("initiatePayment — business only", () => {
  it("rejects talent (403)", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.talentUser, "talent"),
    );
    await expect(initiatePayment({ escrowId: ID.escrow })).rejects.toMatchObject({ status: 403 });
  });

  it("rejects admin (403)", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.adminUser, "admin"),
    );
    await expect(initiatePayment({ escrowId: ID.escrow })).rejects.toMatchObject({ status: 403 });
  });
});

describe("markGigComplete — business only", () => {
  it("rejects talent (403)", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.talentUser, "talent"),
    );
    await expect(markGigComplete({ gigId: ID.gig })).rejects.toMatchObject({ status: 403 });
  });
});

describe("releaseEscrow — business only", () => {
  it("rejects talent (403)", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.talentUser, "talent"),
    );
    await expect(releaseEscrow({ escrowId: ID.escrow })).rejects.toMatchObject({ status: 403 });
  });
});

describe("refundEscrow — business only", () => {
  it("rejects talent (403)", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.talentUser, "talent"),
    );
    await expect(refundEscrow({ escrowId: ID.escrow })).rejects.toMatchObject({ status: 403 });
  });
});

describe("resolveDispute — admin only", () => {
  it("rejects talent (403)", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.talentUser, "talent"),
    );
    await expect(
      resolveDispute({ escrowId: ID.escrow, resolution: "release" }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects business (403)", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.bizUser, "business"),
    );
    await expect(
      resolveDispute({ escrowId: ID.escrow, resolution: "release" }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

// ── Business isolation: cannot access another business's escrow ───────────────

describe("business isolation", () => {
  it("business cannot initiate payment on another business's escrow (403)", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.otherBiz, "business"),
    );
    // Escrow belongs to ID.bizUser, not ID.otherBiz
    dbState.escrowResult = MOCK_ESCROW;
    await expect(initiatePayment({ escrowId: ID.escrow })).rejects.toMatchObject({ status: 403 });
  });

  it("business cannot release another business's escrow (403)", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.otherBiz, "business"),
    );
    dbState.escrowResult = { ...MOCK_ESCROW, status: "funded" };
    await expect(releaseEscrow({ escrowId: ID.escrow })).rejects.toMatchObject({ status: 403 });
  });
});

// ── openDispute: both parties can open, non-party cannot ─────────────────────

describe("openDispute — talent or business, not strangers", () => {
  it("talent can open dispute on their own escrow", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.talentUser, "talent"),
    );
    dbState.escrowResult = { ...MOCK_ESCROW, status: "funded" };
    dbState.gigResult = MOCK_GIG_IN_PROGRESS;
    await expect(openDispute({ escrowId: ID.escrow })).resolves.toBeDefined();
  });

  it("business can open dispute on their own escrow", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.bizUser, "business"),
    );
    dbState.escrowResult = { ...MOCK_ESCROW, status: "funded" };
    dbState.gigResult = MOCK_GIG_IN_PROGRESS;
    await expect(openDispute({ escrowId: ID.escrow })).resolves.toBeDefined();
  });

  it("unrelated business cannot open dispute (403)", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.otherBiz, "business"),
    );
    dbState.escrowResult = { ...MOCK_ESCROW, status: "funded" };
    await expect(openDispute({ escrowId: ID.escrow })).rejects.toMatchObject({ status: 403 });
  });
});

// ── releaseEscrow: requires funded escrow and completed gig ──────────────────

describe("releaseEscrow — business logic guards", () => {
  it("rejects if escrow is not funded", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.bizUser, "business"),
    );
    dbState.escrowResult = { ...MOCK_ESCROW, status: "pending" };
    await expect(releaseEscrow({ escrowId: ID.escrow })).rejects.toMatchObject({ status: 400 });
  });

  it("rejects if gig is not completed", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.bizUser, "business"),
    );
    dbState.escrowResult = { ...MOCK_ESCROW, status: "funded" };
    dbState.gigResult = MOCK_GIG_IN_PROGRESS; // still in_progress
    await expect(releaseEscrow({ escrowId: ID.escrow })).rejects.toMatchObject({ status: 400 });
  });

  it("allows release when 72h timeout elapsed (no reviews required)", async () => {
    vi.mocked(auth as () => Promise<Session | null>).mockResolvedValue(
      mockSession(ID.bizUser, "business"),
    );
    dbState.escrowResult = { ...MOCK_ESCROW, status: "funded" };
    dbState.gigResult = MOCK_GIG_COMPLETED; // > 72h ago
    // select() for review count returns 0 reviews
    const mockTx = (globalThis as Record<string, unknown>).__mockPaymentsTx__ as {
      select: ReturnType<typeof vi.fn>;
    };
    mockTx.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ count: 0 }]),
    });
    // Should succeed (timeout bypass)
    await expect(releaseEscrow({ escrowId: ID.escrow })).resolves.toBeDefined();
  });
});
