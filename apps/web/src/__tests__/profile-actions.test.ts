/**
 * Talent and Business profile action success + upsert branch tests.
 */
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@mahara/matching", () => ({
  updateTalentEmbedding: vi.fn().mockResolvedValue(undefined),
}));

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

import { getOwnBusinessProfile, upsertBusinessProfile } from "@/app/actions/business-profile";
import {
  getOwnTalentProfile,
  setAvailability,
  upsertTalentProfile,
} from "@/app/actions/talent-profile";
import { auth } from "@/lib/auth";

function asSession(role: "talent" | "business" | "admin") {
  vi.mocked(auth).mockResolvedValue({
    user: { id: "user-1", role, name: "Test", email: "test@test.ma" },
  } as Session);
}

const TALENT_INPUT = {
  bio: "Frontend dev",
  skills: [{ skill: "React", level: "advanced" as const, verified: false }],
  portfolioUrls: [],
  languages: ["fr"],
  availability: "available" as const,
};

const BUSINESS_INPUT = {
  companyName: "Acme SARL",
  sector: "e-commerce",
};

// ── upsertTalentProfile ───────────────────────────────────────────────────────

describe("upsertTalentProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("talent");
  });

  it("creates talent profile when none exists", async () => {
    const created = { id: "tp-new", userId: "user-1", ...TALENT_INPUT };
    mockTx = {
      query: { talentProfiles: { findFirst: vi.fn().mockResolvedValue(null) } },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([created]) }),
      }),
    };
    const result = await upsertTalentProfile(TALENT_INPUT);
    expect(result).toMatchObject({ id: "tp-new" });
    expect(mockTx.insert).toHaveBeenCalledOnce();
  });

  it("updates existing talent profile", async () => {
    const existing = { id: "tp-1", userId: "user-1" };
    const updated = { ...existing, ...TALENT_INPUT };
    mockTx = {
      query: { talentProfiles: { findFirst: vi.fn().mockResolvedValue(existing) } },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([updated]) }),
      }),
    };
    const result = await upsertTalentProfile(TALENT_INPUT);
    expect(result).toMatchObject({ id: "tp-1" });
    expect(mockTx.update).toHaveBeenCalledOnce();
  });
});

// ── getOwnTalentProfile ───────────────────────────────────────────────────────

describe("getOwnTalentProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("talent");
  });

  it("returns talent profile for authenticated user", async () => {
    const profile = { id: "tp-1", userId: "user-1" };
    mockTx = {
      query: { talentProfiles: { findFirst: vi.fn().mockResolvedValue(profile) } },
    };
    const result = await getOwnTalentProfile();
    expect(result).toEqual(profile);
  });

  it("returns undefined when no profile exists", async () => {
    mockTx = {
      query: { talentProfiles: { findFirst: vi.fn().mockResolvedValue(undefined) } },
    };
    const result = await getOwnTalentProfile();
    expect(result).toBeUndefined();
  });
});

// ── setAvailability ───────────────────────────────────────────────────────────

describe("setAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("talent");
  });

  it("sets availability without error", async () => {
    mockTx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };
    await expect(setAvailability({ availability: "available" })).resolves.toBeUndefined();
    expect(mockTx.update).toHaveBeenCalledOnce();
  });

  it("sets in_project availability", async () => {
    mockTx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };
    await expect(setAvailability({ availability: "in_project" })).resolves.toBeUndefined();
  });
});

// ── upsertBusinessProfile ─────────────────────────────────────────────────────

describe("upsertBusinessProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("business");
  });

  it("creates business profile when none exists", async () => {
    const created = { id: "bp-new", userId: "user-1", companyName: "Acme SARL" };
    mockTx = {
      query: { businessProfiles: { findFirst: vi.fn().mockResolvedValue(null) } },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([created]) }),
      }),
    };
    const result = await upsertBusinessProfile(BUSINESS_INPUT);
    expect(result).toMatchObject({ id: "bp-new" });
    expect(mockTx.insert).toHaveBeenCalledOnce();
  });

  it("updates existing business profile", async () => {
    const existing = { id: "bp-1", userId: "user-1" };
    const updated = { ...existing, companyName: "Acme SARL" };
    mockTx = {
      query: { businessProfiles: { findFirst: vi.fn().mockResolvedValue(existing) } },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([updated]) }),
      }),
    };
    const result = await upsertBusinessProfile(BUSINESS_INPUT);
    expect(result).toMatchObject({ id: "bp-1" });
    expect(mockTx.update).toHaveBeenCalledOnce();
  });
});

// ── getOwnBusinessProfile ─────────────────────────────────────────────────────

describe("getOwnBusinessProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asSession("business");
  });

  it("returns business profile for authenticated user", async () => {
    const profile = { id: "bp-1", userId: "user-1", companyName: "Acme" };
    mockTx = {
      query: { businessProfiles: { findFirst: vi.fn().mockResolvedValue(profile) } },
    };
    const result = await getOwnBusinessProfile();
    expect(result).toEqual(profile);
  });
});
