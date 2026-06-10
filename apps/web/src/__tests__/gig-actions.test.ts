/**
 * Gig action success paths + error branches not covered by gig-proposal-rbac.test.ts.
 */
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@mahara/matching", () => ({ updateGigEmbedding: vi.fn().mockResolvedValue(undefined) }));

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

import { closeGig, createGig, getOwnGigs, publishGig, updateGig } from "@/app/actions/gig";
import { auth } from "@/lib/auth";

// ── helpers ───────────────────────────────────────────────────────────────────

function asSession(role: "talent" | "business" | "admin") {
  vi.mocked(auth).mockResolvedValue({
    user: { id: "user-1", role, name: "Test", email: "test@test.ma" },
  } as Session);
}

function makeGig(overrides = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    businessId: "bp-1",
    title: "Test gig",
    description: "desc",
    category: "development",
    skills: ["React"],
    budget: 200000,
    urgent: false,
    status: "draft",
    ...overrides,
  };
}

function makeTx(
  opts: {
    businessProfile?: { id: string; userId: string } | null;
    gig?: ReturnType<typeof makeGig> | null;
    gigs?: ReturnType<typeof makeGig>[];
    insertResult?: unknown[];
    updateResult?: unknown[];
  } = {},
) {
  // Use === undefined so explicitly-passed null means "no profile found"
  const bp =
    opts.businessProfile === undefined ? { id: "bp-1", userId: "user-1" } : opts.businessProfile;
  const gig = opts.gig === undefined ? makeGig() : opts.gig;
  const gigs = opts.gigs ?? (gig ? [gig] : []);
  const insertResult = opts.insertResult ?? (gig ? [{ ...gig, id: "new-gig" }] : []);
  const updateResult = opts.updateResult ?? (gig ? [{ ...gig, status: "open" }] : []);

  return {
    query: {
      businessProfiles: { findFirst: vi.fn().mockResolvedValue(bp) },
      gigs: {
        findFirst: vi.fn().mockResolvedValue(gig),
        findMany: vi.fn().mockResolvedValue(gigs),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(insertResult),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(updateResult),
      }),
    }),
  };
}

const validGigInput = {
  title: "Build landing page for e-commerce",
  description:
    "A fully responsive React landing page with animations and modern design patterns for a Moroccan e-commerce startup.",
  category: "development" as const,
  skills: ["React"],
  budget: 200000,
  urgent: false,
};

// ── createGig ─────────────────────────────────────────────────────────────────

describe("createGig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("business");
  });

  it("creates a gig in draft status when business profile exists", async () => {
    mockTx = makeTx();
    const result = await createGig(validGigInput);
    expect(result).toMatchObject({ id: "new-gig" });
    expect(mockTx.insert).toHaveBeenCalledOnce();
  });

  it("throws 403 when business profile is not found", async () => {
    mockTx = makeTx({ businessProfile: null });
    await expect(createGig(validGigInput)).rejects.toMatchObject({ status: 403 });
  });
});

// ── updateGig ─────────────────────────────────────────────────────────────────

describe("updateGig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("business");
  });

  it("updates a draft gig successfully", async () => {
    mockTx = makeTx({ gig: makeGig({ status: "draft" }) });
    const result = await updateGig({
      gigId: "00000000-0000-0000-0000-000000000001",
      title: "Updated title",
    });
    expect(result).toBeDefined();
    expect(mockTx.update).toHaveBeenCalledOnce();
  });

  it("updates an open gig successfully", async () => {
    mockTx = makeTx({ gig: makeGig({ status: "open" }) });
    await expect(
      updateGig({ gigId: "00000000-0000-0000-0000-000000000001" }),
    ).resolves.toBeDefined();
  });

  it("throws 404 when gig not found", async () => {
    mockTx = makeTx({ gig: null });
    await expect(
      updateGig({ gigId: "00000000-0000-0000-0000-000000000001" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 400 for completed gigs", async () => {
    mockTx = makeTx({ gig: makeGig({ status: "completed" }) });
    await expect(
      updateGig({ gigId: "00000000-0000-0000-0000-000000000001" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 403 when business profile is not found", async () => {
    mockTx = makeTx({ businessProfile: null });
    await expect(
      updateGig({ gigId: "00000000-0000-0000-0000-000000000001" }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

// ── publishGig ────────────────────────────────────────────────────────────────

describe("publishGig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("business");
  });

  it("publishes a draft gig to open status", async () => {
    mockTx = makeTx({
      gig: makeGig({ status: "draft" }),
      updateResult: [makeGig({ status: "open" })],
    });
    const result = await publishGig({ gigId: "00000000-0000-0000-0000-000000000001" });
    expect(result).toMatchObject({ status: "open" });
  });

  it("throws 400 when gig is not in draft status", async () => {
    mockTx = makeTx({ gig: makeGig({ status: "open" }) });
    await expect(
      publishGig({ gigId: "00000000-0000-0000-0000-000000000001" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 404 when gig not found", async () => {
    mockTx = makeTx({ gig: null });
    await expect(
      publishGig({ gigId: "00000000-0000-0000-0000-000000000001" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 403 when business profile is missing", async () => {
    mockTx = makeTx({ businessProfile: null });
    await expect(
      publishGig({ gigId: "00000000-0000-0000-0000-000000000001" }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

// ── closeGig ──────────────────────────────────────────────────────────────────

describe("closeGig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("business");
  });

  it("cancels an open gig", async () => {
    mockTx = makeTx({
      gig: makeGig({ status: "open" }),
      updateResult: [makeGig({ status: "cancelled" })],
    });
    const result = await closeGig({ gigId: "00000000-0000-0000-0000-000000000001" });
    expect(result).toMatchObject({ status: "cancelled" });
  });

  it("throws 400 when gig is not open", async () => {
    mockTx = makeTx({ gig: makeGig({ status: "draft" }) });
    await expect(closeGig({ gigId: "00000000-0000-0000-0000-000000000001" })).rejects.toMatchObject(
      { status: 400 },
    );
  });

  it("throws 404 when gig not found", async () => {
    mockTx = makeTx({ gig: null });
    await expect(closeGig({ gigId: "00000000-0000-0000-0000-000000000001" })).rejects.toMatchObject(
      { status: 404 },
    );
  });
});

// ── getOwnGigs ────────────────────────────────────────────────────────────────

describe("getOwnGigs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("business");
  });

  it("returns gigs for business owner", async () => {
    mockTx = makeTx({ gigs: [makeGig(), makeGig({ id: "gig-2" })] });
    const result = await getOwnGigs();
    expect(result).toHaveLength(2);
  });

  it("returns empty array when business profile not found", async () => {
    mockTx = makeTx({ businessProfile: null });
    const result = await getOwnGigs();
    expect(result).toEqual([]);
  });
});
