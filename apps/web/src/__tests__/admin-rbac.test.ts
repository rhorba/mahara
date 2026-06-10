import { getAdminKPIs, getDisputeQueue, getEscrowHealth } from "@/app/actions/admin";
import { resolveDispute } from "@/app/actions/payments";
import {
  approveSkillVerification,
  rejectSkillVerification,
} from "@/app/actions/skill-verification";
import { auth } from "@/lib/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock auth ─────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

// ── Mock @mahara/db ───────────────────────────────────────────────────────────
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

// ── Admin-success mock tx ─────────────────────────────────────────────────────

function makeAdminTx() {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ total: 0, count: 0 }]),
      }),
    }),
    query: {
      escrows: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      skillVerifications: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function expectStatus(fn: () => Promise<unknown>, status: number) {
  try {
    await fn();
    expect.fail(`Expected ActionError(${status}) but action resolved`);
  } catch (err) {
    expect((err as { status?: number }).status).toBe(status);
  }
}

// ── 1. getAdminKPIs ───────────────────────────────────────────────────────────

describe("getAdminKPIs", () => {
  beforeEach(() => {
    currentMockTx = makeAdminTx();
    vi.clearAllMocks();
    // Re-apply mock after clearAllMocks resets calls
    vi.mocked(auth);
  });

  it("unauthenticated → 401", async () => {
    noSession();
    await expectStatus(() => getAdminKPIs({}), 401);
  });

  it("talent → 403", async () => {
    asSession("talent-1", "talent");
    await expectStatus(() => getAdminKPIs({}), 403);
  });

  it("business → 403", async () => {
    asSession("biz-1", "business");
    await expectStatus(() => getAdminKPIs({}), 403);
  });

  it("admin → reaches DB (no auth error)", async () => {
    asSession("admin-1", "admin");
    currentMockTx.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ total: "50000", count: 3 }]),
      }),
    });
    // Should not throw an auth/role error
    const result = await getAdminKPIs({}).catch((e) => {
      if ((e as { status?: number }).status === 401 || (e as { status?: number }).status === 403)
        throw e;
      return null; // DB errors are ok in unit tests
    });
    expect(result).not.toBeUndefined();
  });
});

// ── 2. getEscrowHealth ────────────────────────────────────────────────────────

describe("getEscrowHealth", () => {
  beforeEach(() => {
    currentMockTx = makeAdminTx();
    vi.clearAllMocks();
  });

  it("unauthenticated → 401", async () => {
    noSession();
    await expectStatus(() => getEscrowHealth({}), 401);
  });

  it("talent → 403", async () => {
    asSession("talent-1", "talent");
    await expectStatus(() => getEscrowHealth({}), 403);
  });

  it("business → 403", async () => {
    asSession("biz-1", "business");
    await expectStatus(() => getEscrowHealth({}), 403);
  });
});

// ── 3. getDisputeQueue ────────────────────────────────────────────────────────

describe("getDisputeQueue", () => {
  beforeEach(() => {
    currentMockTx = makeAdminTx();
    vi.clearAllMocks();
  });

  it("unauthenticated → 401", async () => {
    noSession();
    await expectStatus(() => getDisputeQueue({}), 401);
  });

  it("talent → 403", async () => {
    asSession("talent-1", "talent");
    await expectStatus(() => getDisputeQueue({}), 403);
  });

  it("business → 403", async () => {
    asSession("biz-1", "business");
    await expectStatus(() => getDisputeQueue({}), 403);
  });
});

// ── 4. resolveDispute ─────────────────────────────────────────────────────────

describe("resolveDispute", () => {
  const validInput = {
    escrowId: "00000000-0000-0000-0000-000000000001",
    resolution: "release" as const,
  };

  beforeEach(() => {
    currentMockTx = makeAdminTx();
    vi.clearAllMocks();
  });

  it("unauthenticated → 401", async () => {
    noSession();
    await expectStatus(() => resolveDispute(validInput), 401);
  });

  it("talent → 403", async () => {
    asSession("talent-1", "talent");
    await expectStatus(() => resolveDispute(validInput), 403);
  });

  it("business → 403", async () => {
    asSession("biz-1", "business");
    await expectStatus(() => resolveDispute(validInput), 403);
  });
});

// ── 5. approveSkillVerification ───────────────────────────────────────────────

describe("approveSkillVerification", () => {
  const validInput = { verificationId: "00000000-0000-0000-0000-000000000002" };

  beforeEach(() => {
    currentMockTx = makeAdminTx();
    vi.clearAllMocks();
  });

  it("unauthenticated → 401", async () => {
    noSession();
    await expectStatus(() => approveSkillVerification(validInput), 401);
  });

  it("talent → 403", async () => {
    asSession("talent-1", "talent");
    await expectStatus(() => approveSkillVerification(validInput), 403);
  });

  it("business → 403", async () => {
    asSession("biz-1", "business");
    await expectStatus(() => approveSkillVerification(validInput), 403);
  });
});

// ── 6. rejectSkillVerification ────────────────────────────────────────────────

describe("rejectSkillVerification", () => {
  const validInput = { verificationId: "00000000-0000-0000-0000-000000000003" };

  beforeEach(() => {
    currentMockTx = makeAdminTx();
    vi.clearAllMocks();
  });

  it("unauthenticated → 401", async () => {
    noSession();
    await expectStatus(() => rejectSkillVerification(validInput), 401);
  });

  it("talent → 403", async () => {
    asSession("talent-1", "talent");
    await expectStatus(() => rejectSkillVerification(validInput), 403);
  });

  it("business → 403", async () => {
    asSession("biz-1", "business");
    await expectStatus(() => rejectSkillVerification(validInput), 403);
  });
});
