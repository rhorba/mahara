import type { Session } from "next-auth";
/**
 * S1-11: Profile RBAC and role isolation tests.
 * Verifies: business cannot call talent action; talent cannot call business action.
 * Role isolation (talent A cannot edit B's profile) is enforced by RLS + withRole userId.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Module mocks must be at top level (vitest hoists them) ───────────────────
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@mahara/db", () => {
  const mockTx = {
    query: {
      talentProfiles: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      businessProfiles: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "new-id", userId: "user-id" }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "existing-id" }]),
        }),
      }),
    }),
  };

  return {
    db: {
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    },
    withUserContext: vi.fn(
      async (_userId: string, _role: string, fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx),
    ),
    talentProfiles: { userId: "userId" },
    businessProfiles: { userId: "userId" },
  };
});

import { upsertBusinessProfile } from "@/app/actions/business-profile";
import { upsertTalentProfile } from "@/app/actions/talent-profile";
import { auth } from "@/lib/auth";

const mockAuth = vi.mocked(auth as () => Promise<import("next-auth").Session | null>);

const TALENT_SESSION: Session = {
  user: { id: "talent-user-id", email: "t@test.ma", name: "T", role: "talent" },
  expires: "2099-01-01",
};

const BUSINESS_SESSION: Session = {
  user: { id: "biz-user-id", email: "b@test.ma", name: "B", role: "business" },
  expires: "2099-01-01",
};

const VALID_TALENT_INPUT = {
  bio: "Je suis designer",
  skills: [{ skill: "Figma", level: "advanced" as const, verified: false }],
  portfolioUrls: [],
  languages: ["fr"],
  availability: "available" as const,
};

const VALID_BUSINESS_INPUT = {
  companyName: "Souk Digital",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Talent profile RBAC ─────────────────────────────────────────────────────

describe("upsertTalentProfile — RBAC (S1-11)", () => {
  it("allows talent to upsert own profile", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    const result = await upsertTalentProfile(VALID_TALENT_INPUT);
    expect(result).toBeDefined();
  });

  it("rejects business with 403", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    await expect(upsertTalentProfile(VALID_TALENT_INPUT)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects unauthenticated with 401", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(upsertTalentProfile(VALID_TALENT_INPUT)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("rejects invalid input with ZodError", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    await expect(
      upsertTalentProfile({ availability: "available" as const } as never),
    ).rejects.toThrow();
  });

  it("userId always comes from session — input cannot override", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    const { withUserContext } = await import("@mahara/db");
    const spy = vi.mocked(withUserContext);

    await upsertTalentProfile(VALID_TALENT_INPUT);

    // withUserContext must be called with the session userId, not anything from input
    expect(spy).toHaveBeenCalledWith(
      TALENT_SESSION.user.id,
      TALENT_SESSION.user.role,
      expect.any(Function),
    );
  });
});

// ─── Business profile RBAC ───────────────────────────────────────────────────

describe("upsertBusinessProfile — RBAC (S1-11)", () => {
  it("allows business to upsert own profile", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    const result = await upsertBusinessProfile(VALID_BUSINESS_INPUT);
    expect(result).toBeDefined();
  });

  it("rejects talent with 403", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    await expect(upsertBusinessProfile(VALID_BUSINESS_INPUT)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects unauthenticated with 401", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(upsertBusinessProfile(VALID_BUSINESS_INPUT)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("userId always from session", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    const { withUserContext } = await import("@mahara/db");
    const spy = vi.mocked(withUserContext);

    await upsertBusinessProfile(VALID_BUSINESS_INPUT);

    expect(spy).toHaveBeenCalledWith(
      BUSINESS_SESSION.user.id,
      BUSINESS_SESSION.user.role,
      expect.any(Function),
    );
  });
});

// ─── Role isolation note ─────────────────────────────────────────────────────

describe("RLS isolation — profile ownership (S1-11)", () => {
  it("withUserContext sets userId from session — guarantees RLS scope", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    const { withUserContext } = await import("@mahara/db");
    const spy = vi.mocked(withUserContext);

    await upsertTalentProfile(VALID_TALENT_INPUT);

    // The RLS policy `talent_profiles_update` uses user_id = app.current_user.
    // withUserContext sets app.current_user = userId.
    // So talent A can never update talent B's row — the WHERE clause enforces this.
    const calledUserId = spy.mock.calls[0]?.[0];
    expect(calledUserId).toBe(TALENT_SESSION.user.id);
    expect(calledUserId).not.toBe(BUSINESS_SESSION.user.id);
  });
});
