/**
 * S2-10: Gig + Proposal RBAC and role isolation tests.
 *
 * Verifies:
 * - talent cannot create/manage gigs (403)
 * - business cannot apply/withdraw proposals (403)
 * - unauthenticated calls get 401
 * - userId always from session — never from client input
 * - acceptProposal writes audit log in same transaction
 */
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── vi.hoisted — state shared between hoisted vi.mock factory and tests ──────

const dbState = vi.hoisted(() => ({
  businessProfileResult: null as unknown,
  talentProfileResult: null as unknown,
  gigResult: null as unknown,
  proposalResult: null as unknown,
}));

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@mahara/db", () => {
  const insert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    }),
  });

  const update = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  });

  const mockTx = {
    query: {
      businessProfiles: { findFirst: vi.fn(async () => dbState.businessProfileResult) },
      talentProfiles: { findFirst: vi.fn(async () => dbState.talentProfileResult) },
      gigs: {
        findFirst: vi.fn(async () => dbState.gigResult),
        findMany: vi.fn(async () => []),
      },
      proposals: {
        findFirst: vi.fn(async () => dbState.proposalResult),
        findMany: vi.fn(async () => []),
      },
    },
    insert,
    update,
  };

  // Expose for per-test override
  (globalThis as Record<string, unknown>).__mockTx__ = mockTx;

  return {
    db: {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    },
    withUserContext: vi.fn(
      async (_userId: string, _role: string, fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx),
    ),
    businessProfiles: { userId: "userId", id: "id" },
    talentProfiles: { userId: "userId", id: "id" },
    gigs: { id: "id", businessId: "businessId", status: "status", assignedTalentId: null },
    proposals: { id: "id", gigId: "gigId", talentId: "talentId", status: "status" },
    escrows: { id: "id" },
    messageThreads: { id: "id" },
    auditLogs: { id: "id" },
  };
});

import {
  closeGig,
  createGig,
  getOwnGigs,
  publishGig,
  updateGig,
} from "@/app/actions/gig";
import {
  acceptProposal,
  applyToGig,
  getGigProposals,
  getOwnProposals,
  rejectProposal,
  withdrawProposal,
} from "@/app/actions/proposal";
import { auth } from "@/lib/auth";
import { withUserContext } from "@mahara/db";

// ── Test fixtures (UUIDs required by Zod schema) ─────────────────────────────

const ID = {
  gig: "a1a1a1a1-0000-0000-0000-000000000001",
  proposal: "a2a2a2a2-0000-0000-0000-000000000002",
  bizProfile: "a3a3a3a3-0000-0000-0000-000000000003",
  talentProfile: "a4a4a4a4-0000-0000-0000-000000000004",
  bizUser: "a5a5a5a5-0000-0000-0000-000000000005",
  talentUser: "a6a6a6a6-0000-0000-0000-000000000006",
  escrow: "a7a7a7a7-0000-0000-0000-000000000007",
  thread: "a8a8a8a8-0000-0000-0000-000000000008",
};

const MOCK_BUSINESS_PROFILE = {
  id: ID.bizProfile,
  userId: ID.bizUser,
  companyName: "Test Co",
  verifiedBusiness: false,
};

const MOCK_TALENT_PROFILE = {
  id: ID.talentProfile,
  userId: ID.talentUser,
  skills: [],
  verificationStatus: "unverified",
  completedGigs: 0,
};

const MOCK_GIG = {
  id: ID.gig,
  businessId: ID.bizProfile,
  title: "Design landing page",
  description: "A detailed description with at least 50 chars here ok.",
  category: "design" as const,
  skills: ["Figma"],
  budget: 200000,
  status: "open" as const,
  urgent: false,
  duration: "2 weeks",
  deadline: null,
  requirementVector: null,
  assignedTalentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_PROPOSAL = {
  id: ID.proposal,
  gigId: ID.gig,
  talentId: ID.talentProfile,
  status: "pending" as const,
  matchScore: 0,
  coverLetter: null,
  proposedBudget: null,
  estimatedDays: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  gig: MOCK_GIG,
};

const MOCK_ESCROW = {
  id: ID.escrow,
  gigId: ID.gig,
  proposalId: ID.proposal,
  businessId: ID.bizUser,
  talentId: ID.talentUser,
  grossAmount: 200000,
  platformFeeFromBusiness: 20000,
  platformFeeFromTalent: 10000,
  talentPayout: 190000,
  status: "pending" as const,
  fundedAt: null,
  releasedAt: null,
  createdAt: new Date(),
};

const MOCK_THREAD = {
  id: ID.thread,
  gigId: ID.gig,
  proposalId: ID.proposal,
  talentId: ID.talentUser,
  businessId: ID.bizUser,
  lastMessageAt: new Date(),
  createdAt: new Date(),
};

// ── Session constants ─────────────────────────────────────────────────────────

const mockAuth = vi.mocked(auth as () => Promise<Session | null>);

const TALENT_SESSION: Session = {
  user: { id: ID.talentUser, email: "talent@test.ma", name: "Yasmine", role: "talent" },
  expires: "2099-01-01",
};

const BUSINESS_SESSION: Session = {
  user: { id: ID.bizUser, email: "biz@test.ma", name: "Hassan", role: "business" },
  expires: "2099-01-01",
};

// ── Action inputs ─────────────────────────────────────────────────────────────

const VALID_GIG_INPUT = {
  title: "Design landing page for shop",
  description: "We need a professional landing page design with modern aesthetics and UX.",
  category: "design" as const,
  skills: ["Figma", "UI/UX"],
  budget: 200000,
  urgent: false,
};

const VALID_PROPOSAL_INPUT = {
  gigId: ID.gig,
  coverLetter: "I am the right person for this job.",
};

// ── Helper to access the shared mockTx from globalThis ───────────────────────

function tx() {
  return (globalThis as Record<string, unknown>).__mockTx__ as {
    query: {
      businessProfiles: { findFirst: ReturnType<typeof vi.fn> };
      talentProfiles: { findFirst: ReturnType<typeof vi.fn> };
      gigs: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
      proposals: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
    };
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  dbState.businessProfileResult = null;
  dbState.talentProfileResult = null;
  dbState.gigResult = null;
  dbState.proposalResult = null;

  // Restore default no-op insert/update chains after clearAllMocks
  tx().insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    }),
  });
  tx().update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  });
});

// ─── Gig CRUD — role denials ─────────────────────────────────────────────────

describe("createGig — RBAC (S2-10)", () => {
  it("rejects talent with 403", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    await expect(createGig(VALID_GIG_INPUT)).rejects.toMatchObject({ status: 403 });
  });

  it("rejects unauthenticated with 401", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(createGig(VALID_GIG_INPUT)).rejects.toMatchObject({ status: 401 });
  });

  it("rejects business without profile with 403", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    dbState.businessProfileResult = null;
    await expect(createGig(VALID_GIG_INPUT)).rejects.toMatchObject({ status: 403 });
  });

  it("allows business with profile to create gig", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    dbState.businessProfileResult = MOCK_BUSINESS_PROFILE;

    tx().insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([MOCK_GIG]),
      }),
    });

    const result = await createGig(VALID_GIG_INPUT);
    expect(result).toMatchObject({ id: ID.gig });
  });

  it("userId comes from session — withUserContext called with session userId", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    dbState.businessProfileResult = MOCK_BUSINESS_PROFILE;

    tx().insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([MOCK_GIG]),
      }),
    });

    await createGig(VALID_GIG_INPUT);

    expect(vi.mocked(withUserContext)).toHaveBeenCalledWith(
      BUSINESS_SESSION.user.id,
      BUSINESS_SESSION.user.role,
      expect.any(Function),
    );
  });
});

describe("updateGig — RBAC (S2-10)", () => {
  it("rejects talent with 403", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    await expect(updateGig({ gigId: ID.gig, title: "New title" })).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects unauthenticated with 401", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(updateGig({ gigId: ID.gig })).rejects.toMatchObject({ status: 401 });
  });
});

describe("publishGig — RBAC (S2-10)", () => {
  it("rejects talent with 403", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    await expect(publishGig({ gigId: ID.gig })).rejects.toMatchObject({ status: 403 });
  });

  it("rejects unauthenticated with 401", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(publishGig({ gigId: ID.gig })).rejects.toMatchObject({ status: 401 });
  });
});

describe("closeGig — RBAC (S2-10)", () => {
  it("rejects talent with 403", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    await expect(closeGig({ gigId: ID.gig })).rejects.toMatchObject({ status: 403 });
  });

  it("rejects unauthenticated with 401", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(closeGig({ gigId: ID.gig })).rejects.toMatchObject({ status: 401 });
  });
});

describe("getOwnGigs — RBAC (S2-10)", () => {
  it("rejects talent with 403", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    await expect(getOwnGigs()).rejects.toMatchObject({ status: 403 });
  });

  it("rejects unauthenticated with 401", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getOwnGigs()).rejects.toMatchObject({ status: 401 });
  });
});

// ─── Proposal — role denials ─────────────────────────────────────────────────

describe("applyToGig — RBAC (S2-10)", () => {
  it("rejects business with 403", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    await expect(applyToGig(VALID_PROPOSAL_INPUT)).rejects.toMatchObject({ status: 403 });
  });

  it("rejects unauthenticated with 401", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(applyToGig(VALID_PROPOSAL_INPUT)).rejects.toMatchObject({ status: 401 });
  });

  it("rejects talent without profile with 403", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    dbState.talentProfileResult = null;
    await expect(applyToGig(VALID_PROPOSAL_INPUT)).rejects.toMatchObject({ status: 403 });
  });

  it("rejects when gig is not open (in_progress)", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    dbState.talentProfileResult = MOCK_TALENT_PROFILE;
    dbState.gigResult = { ...MOCK_GIG, status: "in_progress" };
    await expect(applyToGig(VALID_PROPOSAL_INPUT)).rejects.toMatchObject({ status: 400 });
  });

  it("allows talent with profile to apply to open gig", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    dbState.talentProfileResult = MOCK_TALENT_PROFILE;
    dbState.gigResult = MOCK_GIG;

    tx().insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([MOCK_PROPOSAL]),
      }),
    });

    const result = await applyToGig(VALID_PROPOSAL_INPUT);
    expect(result).toMatchObject({ id: ID.proposal });
  });

  it("userId comes from session — withUserContext called with session userId", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    dbState.talentProfileResult = MOCK_TALENT_PROFILE;
    dbState.gigResult = MOCK_GIG;

    tx().insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([MOCK_PROPOSAL]),
      }),
    });

    await applyToGig(VALID_PROPOSAL_INPUT);

    expect(vi.mocked(withUserContext)).toHaveBeenCalledWith(
      TALENT_SESSION.user.id,
      TALENT_SESSION.user.role,
      expect.any(Function),
    );
  });
});

describe("withdrawProposal — RBAC (S2-10)", () => {
  it("rejects business with 403", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    await expect(withdrawProposal({ proposalId: ID.proposal })).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects unauthenticated with 401", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(withdrawProposal({ proposalId: ID.proposal })).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe("getOwnProposals — RBAC (S2-10)", () => {
  it("rejects business with 403", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    await expect(getOwnProposals()).rejects.toMatchObject({ status: 403 });
  });

  it("rejects unauthenticated with 401", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getOwnProposals()).rejects.toMatchObject({ status: 401 });
  });
});

describe("acceptProposal — RBAC (S2-10)", () => {
  it("rejects talent with 403", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    await expect(acceptProposal({ proposalId: ID.proposal })).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects unauthenticated with 401", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(acceptProposal({ proposalId: ID.proposal })).rejects.toMatchObject({
      status: 401,
    });
  });

  it("rejects when gig does not belong to business (ownership isolation)", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    dbState.businessProfileResult = {
      ...MOCK_BUSINESS_PROFILE,
      id: "other-biz-profile-id", // different profile than gig.businessId
    };
    dbState.proposalResult = MOCK_PROPOSAL; // gig.businessId = "biz-profile-id"

    await expect(acceptProposal({ proposalId: ID.proposal })).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects when proposal is already accepted", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    dbState.businessProfileResult = MOCK_BUSINESS_PROFILE;
    dbState.proposalResult = { ...MOCK_PROPOSAL, status: "accepted" };

    await expect(acceptProposal({ proposalId: ID.proposal })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("creates audit log entry on acceptance (3 inserts: escrow + thread + audit)", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    dbState.businessProfileResult = MOCK_BUSINESS_PROFILE;
    dbState.proposalResult = MOCK_PROPOSAL;
    dbState.talentProfileResult = MOCK_TALENT_PROFILE;

    tx().update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...MOCK_GIG, status: "in_progress" }]),
        }),
      }),
    });

    let insertCount = 0;
    tx().insert.mockImplementation(() => ({
      values: vi.fn().mockImplementation(() => {
        insertCount++;
        return {
          returning: vi.fn().mockResolvedValue([insertCount === 1 ? MOCK_ESCROW : MOCK_THREAD]),
        };
      }),
    }));

    const result = await acceptProposal({ proposalId: ID.proposal });
    expect(result).toMatchObject({ escrow: { id: ID.escrow } });
    // escrow insert + thread insert + auditLog insert = 3
    expect(tx().insert).toHaveBeenCalledTimes(3);
  });
});

describe("rejectProposal — RBAC (S2-10)", () => {
  it("rejects talent with 403", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    await expect(rejectProposal({ proposalId: ID.proposal })).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects unauthenticated with 401", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(rejectProposal({ proposalId: ID.proposal })).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe("getGigProposals — RBAC (S2-10)", () => {
  it("rejects talent with 403", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    await expect(getGigProposals({ gigId: ID.gig })).rejects.toMatchObject({ status: 403 });
  });

  it("rejects unauthenticated with 401", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getGigProposals({ gigId: ID.gig })).rejects.toMatchObject({ status: 401 });
  });

  it("rejects when gig does not belong to business (404)", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    dbState.businessProfileResult = MOCK_BUSINESS_PROFILE;
    dbState.gigResult = null; // gig belongs to a different business → not found
    await expect(getGigProposals({ gigId: ID.gig })).rejects.toMatchObject({ status: 404 });
  });
});

// ─── Cross-role isolation ────────────────────────────────────────────────────

describe("Cross-role isolation — userId always from session (S2-10)", () => {
  it("createGig passes business session userId to withUserContext", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    dbState.businessProfileResult = MOCK_BUSINESS_PROFILE;

    tx().insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([MOCK_GIG]),
      }),
    });

    await createGig(VALID_GIG_INPUT);

    const [calledUserId] = vi.mocked(withUserContext).mock.calls[0] ?? [];
    expect(calledUserId).toBe(ID.bizUser);
    expect(calledUserId).not.toBe(ID.talentUser);
  });

  it("applyToGig passes talent session userId to withUserContext", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    dbState.talentProfileResult = MOCK_TALENT_PROFILE;
    dbState.gigResult = MOCK_GIG;

    tx().insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([MOCK_PROPOSAL]),
      }),
    });

    await applyToGig(VALID_PROPOSAL_INPUT);

    const [calledUserId] = vi.mocked(withUserContext).mock.calls[0] ?? [];
    expect(calledUserId).toBe(ID.talentUser);
    expect(calledUserId).not.toBe(ID.bizUser);
  });
});
