import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// ─── Mocks — must be declared before imports that use them ───────────────────

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@mahara/db", () => ({
  db: {},
  withUserContext: vi.fn(async (_uid: string, _role: string, fn: (tx: object) => unknown) =>
    fn({}),
  ),
}));

// ─── Imports (resolved after mocks are registered) ───────────────────────────

import { auth } from "@/lib/auth";
import { withUserContext } from "@mahara/db";
import { ActionError } from "../errors";
import { withRole, withRoleNoInput } from "../with-role";

const mockAuth = vi.mocked(auth as () => Promise<import("next-auth").Session | null>);
const mockWithUserContext = vi.mocked(withUserContext);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const schema = z.object({ name: z.string().min(1) });

function session(role: "talent" | "business" | "admin") {
  return {
    user: {
      id: `user-${role}-uuid`,
      role,
      email: `${role}@test.ma`,
      name: role,
    },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  };
}

// ─── Auth checks ─────────────────────────────────────────────────────────────

describe("withRole() — authentication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws ActionError(401) when auth() returns null", async () => {
    mockAuth.mockResolvedValue(null);
    const action = withRole(["talent"], schema, async () => "ok");
    await expect(action({ name: "x" })).rejects.toMatchObject({ status: 401 });
    expect(mockWithUserContext).not.toHaveBeenCalled();
  });

  it("throws ActionError(401) when session.user.id is missing", async () => {
    // Simulates a malformed session — cast needed to test the guard
    mockAuth.mockResolvedValue({
      user: { role: "talent" as const, name: "x", email: "x@x.ma" },
      expires: "2099",
    } as import("next-auth").Session);
    const action = withRole(["talent"], schema, async () => "ok");
    await expect(action({ name: "x" })).rejects.toMatchObject({ status: 401 });
  });
});

// ─── Role isolation (S0-16 CRITICAL) ─────────────────────────────────────────

describe("withRole() — role isolation (S0-16)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks talent from business-only actions → 403", async () => {
    mockAuth.mockResolvedValue(session("talent"));
    const postGig = withRole(["business"], schema, async () => "posted");
    await expect(postGig({ name: "My Gig" })).rejects.toMatchObject({ status: 403 });
    expect(mockWithUserContext).not.toHaveBeenCalled();
  });

  it("blocks business from talent-only actions → 403", async () => {
    mockAuth.mockResolvedValue(session("business"));
    const applyToGig = withRole(["talent"], schema, async () => "applied");
    await expect(applyToGig({ name: "Proposal" })).rejects.toMatchObject({ status: 403 });
  });

  it("blocks non-admin from admin-only actions → 403", async () => {
    mockAuth.mockResolvedValue(session("talent"));
    const adminOp = withRole(["admin"], schema, async () => "done");
    await expect(adminOp({ name: "action" })).rejects.toMatchObject({ status: 403 });
  });

  it("allows talent to call talent-only actions", async () => {
    mockAuth.mockResolvedValue(session("talent"));
    const action = withRole(["talent"], schema, async () => "ok");
    await expect(action({ name: "x" })).resolves.toBe("ok");
  });

  it("allows admin to call admin-only actions", async () => {
    mockAuth.mockResolvedValue(session("admin"));
    const action = withRole(["admin"], schema, async () => "admin ok");
    await expect(action({ name: "x" })).resolves.toBe("admin ok");
  });
});

// ─── Role NEVER comes from client input (S0-16) ───────────────────────────────

describe("withRole() — role never from client payload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ignores a crafted role field in the input", async () => {
    mockAuth.mockResolvedValue(session("talent"));
    const action = withRole(["talent"], schema, async (ctx) => ctx.role);
    // Attacker sends role: 'admin' in payload — handler gets role from session
    const result = await action({ name: "legit", role: "admin" });
    expect(result).toBe("talent");
  });

  it("userId in ctx always comes from session, not from input", async () => {
    const s = session("talent");
    mockAuth.mockResolvedValue(s);
    const action = withRole(["talent"], schema, async (ctx) => ctx.userId);
    const result = await action({ name: "x", userId: "attacker-id" });
    expect(result).toBe(s.user.id);
    expect(result).not.toBe("attacker-id");
  });

  it("calls withUserContext with session userId and role", async () => {
    const s = session("business");
    mockAuth.mockResolvedValue(s);
    const action = withRole(["business"], schema, async () => "ok");
    await action({ name: "x" });
    expect(mockWithUserContext).toHaveBeenCalledWith(s.user.id, s.user.role, expect.any(Function));
  });
});

// ─── Zod validation ───────────────────────────────────────────────────────────

describe("withRole() — Zod validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects invalid input before calling handler", async () => {
    mockAuth.mockResolvedValue(session("talent"));
    const action = withRole(
      ["talent"],
      z.object({ budget: z.number().int().positive() }),
      async () => "ok",
    );
    await expect(action({ budget: -5 })).rejects.toThrow();
    expect(mockWithUserContext).not.toHaveBeenCalled();
  });

  it("passes validated input to the handler", async () => {
    mockAuth.mockResolvedValue(session("talent"));
    const action = withRole(
      ["talent"],
      z.object({ n: z.number() }),
      async (ctx) => ctx.input.n * 2,
    );
    await expect(action({ n: 21 })).resolves.toBe(42);
  });
});

// ─── withRoleNoInput ──────────────────────────────────────────────────────────

describe("withRoleNoInput()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("works with no input", async () => {
    mockAuth.mockResolvedValue(session("talent"));
    const action = withRoleNoInput(["talent"], async (ctx) => ctx.role);
    await expect(action()).resolves.toBe("talent");
  });

  it("blocks wrong role", async () => {
    mockAuth.mockResolvedValue(session("talent"));
    const action = withRoleNoInput(["admin"], async () => "ok");
    await expect(action()).rejects.toMatchObject({ status: 403 });
  });
});

// ─── ActionError ──────────────────────────────────────────────────────────────

describe("ActionError", () => {
  it("carries status code and is an Error instance", () => {
    const err = new ActionError(403, "Forbidden");
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(403);
    expect(err.message).toBe("Forbidden");
    expect(err.name).toBe("ActionError");
  });
});
