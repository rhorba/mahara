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

import {
  approveSkillVerification,
  getMyVerifications,
  getPendingVerifications,
  rejectSkillVerification,
  requestSkillVerification,
} from "@/app/actions/skill-verification";
import { auth } from "@/lib/auth";

// ── helpers ───────────────────────────────────────────────────────────────────

function asSession(role: "talent" | "business" | "admin") {
  vi.mocked(auth).mockResolvedValue({
    user: { id: "user-1", role, name: "Test", email: "test@test.ma" },
  } as Session);
}

const TALENT_PROFILE = {
  id: "tp-1",
  userId: "user-1",
  skills: [{ skill: "React", level: "advanced", verified: false }],
  verificationStatus: "unverified",
};

const PENDING_VERIFICATION = {
  id: "00000000-0000-0000-0000-000000000010",
  talentId: "tp-1",
  skill: "React",
  method: "portfolio",
  status: "pending",
  talentProfile: TALENT_PROFILE,
};

function makeInsertReturning(data: unknown) {
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([data]),
      }),
    }),
  };
}

function makeUpdateReturning(data: unknown) {
  return {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([data]),
      }),
    }),
  };
}

// ── requestSkillVerification ──────────────────────────────────────────────────

describe("requestSkillVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("talent");
  });

  it("creates a new verification request", async () => {
    mockTx = {
      query: {
        talentProfiles: { findFirst: vi.fn().mockResolvedValue(TALENT_PROFILE) },
        skillVerifications: { findFirst: vi.fn().mockResolvedValue(null) },
      },
      ...makeInsertReturning(PENDING_VERIFICATION),
    };

    const result = await requestSkillVerification({ skill: "React", method: "portfolio" });
    expect(result).toMatchObject({ skill: "React", status: "pending" });
  });

  it("throws 404 when talent profile not found", async () => {
    mockTx = {
      query: {
        talentProfiles: { findFirst: vi.fn().mockResolvedValue(null) },
      },
      ...makeInsertReturning({}),
    };
    await expect(
      requestSkillVerification({ skill: "React", method: "portfolio" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 400 when skill is not in profile", async () => {
    const profileWithoutReact = { ...TALENT_PROFILE, skills: [] };
    mockTx = {
      query: {
        talentProfiles: { findFirst: vi.fn().mockResolvedValue(profileWithoutReact) },
        skillVerifications: { findFirst: vi.fn().mockResolvedValue(null) },
      },
      ...makeInsertReturning({}),
    };
    await expect(
      requestSkillVerification({ skill: "React", method: "portfolio" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 409 when a pending request already exists", async () => {
    mockTx = {
      query: {
        talentProfiles: { findFirst: vi.fn().mockResolvedValue(TALENT_PROFILE) },
        skillVerifications: {
          findFirst: vi.fn().mockResolvedValue({ ...PENDING_VERIFICATION, status: "pending" }),
        },
      },
      ...makeInsertReturning({}),
    };
    await expect(
      requestSkillVerification({ skill: "React", method: "portfolio" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("throws 409 when skill is already approved", async () => {
    mockTx = {
      query: {
        talentProfiles: { findFirst: vi.fn().mockResolvedValue(TALENT_PROFILE) },
        skillVerifications: {
          findFirst: vi.fn().mockResolvedValue({ ...PENDING_VERIFICATION, status: "approved" }),
        },
      },
      ...makeInsertReturning({}),
    };
    await expect(
      requestSkillVerification({ skill: "React", method: "portfolio" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("allows re-request after previous rejection", async () => {
    mockTx = {
      query: {
        talentProfiles: { findFirst: vi.fn().mockResolvedValue(TALENT_PROFILE) },
        skillVerifications: {
          findFirst: vi.fn().mockResolvedValue({ ...PENDING_VERIFICATION, status: "rejected" }),
        },
      },
      ...makeInsertReturning(PENDING_VERIFICATION),
    };
    const result = await requestSkillVerification({ skill: "React", method: "admin_review" });
    expect(result).toMatchObject({ skill: "React" });
  });
});

// ── approveSkillVerification ──────────────────────────────────────────────────

describe("approveSkillVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("admin");
  });

  it("approves a pending verification", async () => {
    const approved = { ...PENDING_VERIFICATION, status: "approved" };
    mockTx = {
      query: {
        skillVerifications: {
          findFirst: vi.fn().mockResolvedValue(PENDING_VERIFICATION),
        },
      },
      ...makeUpdateReturning(approved),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      }),
    };

    const result = await approveSkillVerification({
      verificationId: "00000000-0000-0000-0000-000000000010",
    });
    expect(result).toMatchObject({ status: "approved" });
  });

  it("throws 404 when verification not found", async () => {
    mockTx = {
      query: {
        skillVerifications: { findFirst: vi.fn().mockResolvedValue(null) },
      },
      ...makeUpdateReturning({}),
    };
    await expect(
      approveSkillVerification({ verificationId: "00000000-0000-0000-0000-000000000001" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 400 when verification is already processed (not pending)", async () => {
    mockTx = {
      query: {
        skillVerifications: {
          findFirst: vi.fn().mockResolvedValue({ ...PENDING_VERIFICATION, status: "approved" }),
        },
      },
      ...makeUpdateReturning({}),
    };
    await expect(
      approveSkillVerification({ verificationId: "00000000-0000-0000-0000-000000000010" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ── rejectSkillVerification ───────────────────────────────────────────────────

describe("rejectSkillVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("admin");
  });

  it("rejects a pending verification", async () => {
    const rejected = { ...PENDING_VERIFICATION, status: "rejected" };
    mockTx = {
      query: {
        skillVerifications: {
          findFirst: vi.fn().mockResolvedValue(PENDING_VERIFICATION),
        },
      },
      ...makeUpdateReturning(rejected),
    };

    const result = await rejectSkillVerification({
      verificationId: "00000000-0000-0000-0000-000000000010",
      adminNote: "Portfolio not sufficient",
    });
    expect(result).toMatchObject({ status: "rejected" });
  });

  it("throws 404 when verification not found", async () => {
    mockTx = {
      query: { skillVerifications: { findFirst: vi.fn().mockResolvedValue(null) } },
      ...makeUpdateReturning({}),
    };
    await expect(
      rejectSkillVerification({ verificationId: "00000000-0000-0000-0000-000000000002" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 400 for non-pending verification", async () => {
    mockTx = {
      query: {
        skillVerifications: {
          findFirst: vi.fn().mockResolvedValue({ ...PENDING_VERIFICATION, status: "rejected" }),
        },
      },
      ...makeUpdateReturning({}),
    };
    await expect(
      rejectSkillVerification({ verificationId: "00000000-0000-0000-0000-000000000010" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

// ── getMyVerifications ────────────────────────────────────────────────────────

describe("getMyVerifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("talent");
  });

  it("returns verifications for existing talent profile", async () => {
    mockTx = {
      query: {
        talentProfiles: { findFirst: vi.fn().mockResolvedValue(TALENT_PROFILE) },
        skillVerifications: { findMany: vi.fn().mockResolvedValue([PENDING_VERIFICATION]) },
      },
    };
    const result = await getMyVerifications({});
    expect(result).toHaveLength(1);
  });

  it("returns empty array when talent profile not found", async () => {
    mockTx = {
      query: {
        talentProfiles: { findFirst: vi.fn().mockResolvedValue(null) },
      },
    };
    const result = await getMyVerifications({});
    expect(result).toEqual([]);
  });
});

// ── getPendingVerifications ───────────────────────────────────────────────────

describe("getPendingVerifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("admin");
  });

  it("returns all pending verifications", async () => {
    mockTx = {
      query: {
        skillVerifications: {
          findMany: vi.fn().mockResolvedValue([PENDING_VERIFICATION]),
        },
      },
    };
    const result = await getPendingVerifications({});
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ status: "pending" });
  });
});
