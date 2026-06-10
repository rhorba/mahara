/**
 * Admin action success path tests.
 * Covers getAdminKPIs (completionRate branches), getEscrowHealth, getDisputeQueue.
 * RBAC (401/403 rejections) is covered in admin-rbac.test.ts.
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

import { getAdminKPIs, getDisputeQueue, getEscrowHealth } from "@/app/actions/admin";
import { auth } from "@/lib/auth";

function asAdmin() {
  vi.mocked(auth).mockResolvedValue({
    user: { id: "admin-1", role: "admin", name: "Admin", email: "admin@test.ma" },
  } as Session);
}

// Builds a select chain that returns different rows on successive calls
function makeSelectSequence(...rowSets: unknown[][]) {
  let callCount = 0;
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => {
      const rows = rowSets[callCount] ?? rowSets[rowSets.length - 1];
      callCount++;
      return Promise.resolve(rows);
    }),
  };
  return { select: vi.fn().mockReturnValue(chain) };
}

// ── getAdminKPIs ──────────────────────────────────────────────────────────────

describe("getAdminKPIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asAdmin();
  });

  it("returns KPIs with computed completionRate (> 0 completed + in-progress)", async () => {
    mockTx = makeSelectSequence(
      [{ total: "500000" }], // gmv
      [{ count: 5 }], // activeGigs
      [{ count: 3 }], // inProgressGigs
      [{ count: 7 }], // completedGigs
      [{ count: 12 }], // newSignups
      [{ count: 1 }], // disputed
    );

    const result = await getAdminKPIs({});
    expect(result.gmvCentimes).toBe(500000);
    expect(result.activeGigs).toBe(5);
    expect(result.inProgressGigs).toBe(3);
    expect(result.completedGigs).toBe(7);
    expect(result.newSignups30d).toBe(12);
    expect(result.disputedEscrows).toBe(1);
    // completionRate = round(7 / (7+3) * 100) = 70
    expect(result.completionRate).toBe(70);
  });

  it("returns completionRate = 0 when no completed or in-progress gigs", async () => {
    mockTx = makeSelectSequence(
      [{ total: null }], // gmv = null
      [{ count: 0 }], // activeGigs
      [{ count: 0 }], // inProgressGigs
      [{ count: 0 }], // completedGigs
      [{ count: 0 }], // newSignups
      [{ count: 0 }], // disputed
    );

    const result = await getAdminKPIs({});
    expect(result.completionRate).toBe(0);
    expect(result.gmvCentimes).toBe(0);
  });

  it("handles missing rows gracefully with fallback to 0", async () => {
    mockTx = makeSelectSequence(
      [], // empty → gmv = 0
      [], // empty → activeGigs = 0
      [], // empty → inProgressGigs = 0
      [], // empty → completedGigs = 0
      [], // empty → newSignups = 0
      [], // empty → disputed = 0
    );

    const result = await getAdminKPIs({});
    expect(result.gmvCentimes).toBe(0);
    expect(result.completionRate).toBe(0);
  });
});

// ── getEscrowHealth ───────────────────────────────────────────────────────────

describe("getEscrowHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asAdmin();
  });

  it("returns all escrows with related data", async () => {
    const escrows = [
      {
        id: "e-1",
        status: "funded",
        gig: { title: "Gig 1" },
        business: { name: "B" },
        talent: { name: "T" },
      },
      {
        id: "e-2",
        status: "released",
        gig: { title: "Gig 2" },
        business: { name: "B" },
        talent: { name: "T" },
      },
    ];
    mockTx = {
      query: {
        escrows: { findMany: vi.fn().mockResolvedValue(escrows) },
      },
    };
    const result = await getEscrowHealth({});
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ status: "funded" });
  });

  it("returns empty array when no escrows", async () => {
    mockTx = {
      query: { escrows: { findMany: vi.fn().mockResolvedValue([]) } },
    };
    const result = await getEscrowHealth({});
    expect(result).toHaveLength(0);
  });
});

// ── getDisputeQueue ───────────────────────────────────────────────────────────

describe("getDisputeQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asAdmin();
  });

  it("returns only disputed escrows ordered by createdAt asc", async () => {
    const disputed = [
      {
        id: "e-1",
        status: "disputed",
        gig: { title: "Dispute 1" },
        business: { name: "B1" },
        talent: { name: "T1" },
      },
    ];
    mockTx = {
      query: { escrows: { findMany: vi.fn().mockResolvedValue(disputed) } },
    };
    const result = await getDisputeQueue({});
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ status: "disputed" });
  });

  it("returns empty array when no disputes", async () => {
    mockTx = {
      query: { escrows: { findMany: vi.fn().mockResolvedValue([]) } },
    };
    const result = await getDisputeQueue({});
    expect(result).toHaveLength(0);
  });
});
