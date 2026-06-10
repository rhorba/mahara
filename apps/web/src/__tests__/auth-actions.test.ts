import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/server/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 9 }),
}));

vi.mock("@mahara/notifications/email", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed_password"),
  argon2id: "argon2id",
}));

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("fr"),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// DB mock — hoisted so factory can reference it
const dbState = vi.hoisted(() => ({
  existingUser: null as unknown,
}));

vi.mock("@mahara/db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(async () => dbState.existingUser),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
  },
  users: { email: "email", id: "id" },
}));

vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "AuthError";
    }
  },
}));

import { loginAction, signOutAction, signupAction } from "@/app/actions/auth";
import { signIn, signOut } from "@/lib/auth";
import { checkRateLimit } from "@/server/rate-limit";
import { AuthError } from "next-auth";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) fd.append(key, value);
  return fd;
}

// ── signupAction ──────────────────────────────────────────────────────────────

describe("signupAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbState.existingUser = null;
    vi.mocked(signIn).mockResolvedValue(undefined as never);
  });

  it("returns error when form data is invalid (missing required fields)", async () => {
    const fd = makeFormData({ email: "bad" });
    const result = await signupAction(null, fd);
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("returns error when email is already in use", async () => {
    dbState.existingUser = { id: "existing", email: "yasmine@test.ma" };
    const fd = makeFormData({
      email: "yasmine@test.ma",
      password: "password123",
      name: "Yasmine",
      role: "talent",
    });
    const result = await signupAction(null, fd);
    expect(result).toMatchObject({ error: "Cet email est déjà utilisé" });
  });

  it("calls signIn after successful registration", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    vi.mocked(signIn).mockRejectedValue(redirectError);

    const fd = makeFormData({
      email: "new@test.ma",
      password: "password123",
      name: "New User",
      role: "talent",
    });

    await expect(signupAction(null, fd)).rejects.toThrow("NEXT_REDIRECT");
    expect(signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ email: "new@test.ma" }),
    );
  });

  it("returns auth error message when signIn throws AuthError", async () => {
    vi.mocked(signIn).mockRejectedValue(new AuthError("CredentialsSignin"));

    const fd = makeFormData({
      email: "new2@test.ma",
      password: "password123",
      name: "New User",
      role: "business",
    });

    const result = await signupAction(null, fd);
    expect(result).toMatchObject({ error: expect.stringContaining("connexion échouée") });
  });

  it("accepts optional city and phone fields", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    vi.mocked(signIn).mockRejectedValue(redirectError);

    const fd = makeFormData({
      email: "city@test.ma",
      password: "password123",
      name: "City User",
      role: "talent",
      city: "Casablanca",
      phone: "+212600000000",
    });

    await expect(signupAction(null, fd)).rejects.toThrow();
    expect(signIn).toHaveBeenCalledOnce();
  });
});

// ── loginAction ───────────────────────────────────────────────────────────────

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 9 });
    vi.mocked(signIn).mockResolvedValue(undefined as never);
  });

  it("returns rate-limit error when limit exceeded", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0 });

    const fd = makeFormData({ email: "user@test.ma", password: "pass" });
    const result = await loginAction(null, fd);
    expect(result).toMatchObject({ error: expect.stringContaining("Trop de tentatives") });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("redirects on successful login (throws NEXT_REDIRECT)", async () => {
    vi.mocked(signIn).mockRejectedValue(new Error("NEXT_REDIRECT"));

    const fd = makeFormData({ email: "user@test.ma", password: "correct" });
    await expect(loginAction(null, fd)).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns credential error on AuthError", async () => {
    vi.mocked(signIn).mockRejectedValue(new AuthError("CredentialsSignin"));

    const fd = makeFormData({ email: "user@test.ma", password: "wrong" });
    const result = await loginAction(null, fd);
    expect(result).toMatchObject({ error: "Email ou mot de passe incorrect" });
  });

  it("re-throws non-AuthError exceptions", async () => {
    vi.mocked(signIn).mockRejectedValue(new Error("unexpected"));

    const fd = makeFormData({ email: "user@test.ma", password: "pass" });
    await expect(loginAction(null, fd)).rejects.toThrow("unexpected");
  });

  it("checks rate limit before calling signIn", async () => {
    vi.mocked(signIn).mockRejectedValue(new Error("NEXT_REDIRECT"));

    const fd = makeFormData({ email: "user@test.ma", password: "pass" });
    await loginAction(null, fd).catch(() => null);
    expect(checkRateLimit).toHaveBeenCalledOnce();
  });
});

// ── signOutAction ─────────────────────────────────────────────────────────────

describe("signOutAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls signOut and redirects", async () => {
    vi.mocked(signOut).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/fr" });
  });
});
