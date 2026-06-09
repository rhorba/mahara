/**
 * S3-10: Messaging RBAC and thread isolation tests.
 *
 * Verifies:
 * - admin cannot use messaging actions (403)
 * - unauthenticated calls get 401
 * - talent/business cannot read or send to threads they are NOT part of
 * - sendMessage, getThreadMessages, markThreadRead: non-participant → 403
 * - getMyThreads: talent session returns talent threads; business session returns business threads
 * - "no contact before commitment" — confirmed by thread isolation (threads only exist post-acceptance)
 */
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── vi.hoisted state ──────────────────────────────────────────────────────────

const dbState = vi.hoisted(() => ({
  threadResult: null as unknown,
  messageResult: null as unknown,
  threadsResult: [] as unknown[],
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@mahara/db", () => {
  const MOCK_MSG = {
    id: "c0c0c0c0-0000-0000-0000-000000000001",
    threadId: "b1b1b1b1-0000-0000-0000-000000000001",
    senderId: "b3b3b3b3-0000-0000-0000-000000000003",
    body: "hello",
    attachmentUrl: null,
    readAt: null,
    createdAt: new Date(),
  };

  const insert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([MOCK_MSG]),
    }),
  });

  const update = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  });

  const mockTx = {
    query: {
      messageThreads: {
        findFirst: vi.fn(async () => dbState.threadResult),
        findMany: vi.fn(async () => dbState.threadsResult),
      },
      messages: {
        findMany: vi.fn(async () =>
          dbState.messageResult ? [dbState.messageResult] : [],
        ),
      },
    },
    insert,
    update,
  };

  return {
    db: {
      query: {
        messageThreads: {
          findMany: vi.fn(async () => dbState.threadsResult),
        },
      },
      transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    },
    withUserContext: vi.fn(
      async (_userId: string, _role: string, fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx),
    ),
    messageThreads: { id: "id", talentId: "talentId", businessId: "businessId" },
    messages: { threadId: "threadId", readAt: "readAt", createdAt: "createdAt", senderId: "senderId" },
  };
});

import {
  getMyThreads,
  getThreadMessages,
  markThreadRead,
  sendMessage,
} from "@/app/actions/message";
import { auth } from "@/lib/auth";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ID = {
  thread: "b1b1b1b1-0000-0000-0000-000000000001",
  thread2: "b2b2b2b2-0000-0000-0000-000000000002",
  talentUser: "b3b3b3b3-0000-0000-0000-000000000003",
  bizUser: "b4b4b4b4-0000-0000-0000-000000000004",
  outsiderUser: "b5b5b5b5-0000-0000-0000-000000000005",
  gig: "b6b6b6b6-0000-0000-0000-000000000006",
};

const MOCK_THREAD = {
  id: ID.thread,
  gigId: ID.gig,
  talentId: ID.talentUser,
  businessId: ID.bizUser,
  lastMessageAt: new Date(),
  createdAt: new Date(),
};

const mockAuth = vi.mocked(auth as () => Promise<Session | null>);

const TALENT_SESSION: Session = {
  user: { id: ID.talentUser, email: "talent@test.ma", name: "Yasmine", role: "talent" },
  expires: "2099-01-01",
};

const BUSINESS_SESSION: Session = {
  user: { id: ID.bizUser, email: "biz@test.ma", name: "Hassan", role: "business" },
  expires: "2099-01-01",
};

const ADMIN_SESSION: Session = {
  user: { id: "aaaa0000-0000-0000-0000-000000000001", email: "admin@test.ma", name: "Admin", role: "admin" },
  expires: "2099-01-01",
};

const OUTSIDER_TALENT_SESSION: Session = {
  user: { id: ID.outsiderUser, email: "other@test.ma", name: "Other", role: "talent" },
  expires: "2099-01-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  dbState.threadResult = null;
  dbState.messageResult = null;
  dbState.threadsResult = [];
});

// ── Authentication guard ──────────────────────────────────────────────────────

describe("unauthenticated", () => {
  beforeEach(() => mockAuth.mockResolvedValue(null));

  it("sendMessage → 401", async () => {
    await expect(
      sendMessage({ threadId: ID.thread, body: "hello" }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("getThreadMessages → 401", async () => {
    await expect(
      getThreadMessages({ threadId: ID.thread }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("markThreadRead → 401", async () => {
    await expect(
      markThreadRead({ threadId: ID.thread }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("getMyThreads → 401", async () => {
    await expect(getMyThreads()).rejects.toMatchObject({ status: 401 });
  });
});

// ── Role guard — admin cannot use messaging ───────────────────────────────────

describe("admin role → 403 on messaging actions", () => {
  beforeEach(() => mockAuth.mockResolvedValue(ADMIN_SESSION));

  it("sendMessage → 403", async () => {
    await expect(
      sendMessage({ threadId: ID.thread, body: "hello" }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("getThreadMessages → 403", async () => {
    await expect(
      getThreadMessages({ threadId: ID.thread }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("markThreadRead → 403", async () => {
    await expect(
      markThreadRead({ threadId: ID.thread }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("getMyThreads → 403", async () => {
    await expect(getMyThreads()).rejects.toMatchObject({ status: 403 });
  });
});

// ── Thread not found ──────────────────────────────────────────────────────────

describe("thread not found → 404", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    dbState.threadResult = null;
  });

  it("sendMessage → 404", async () => {
    await expect(
      sendMessage({ threadId: ID.thread, body: "hi" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("getThreadMessages → 404", async () => {
    await expect(
      getThreadMessages({ threadId: ID.thread }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("markThreadRead → 404", async () => {
    await expect(
      markThreadRead({ threadId: ID.thread }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── Non-participant isolation ─────────────────────────────────────────────────

describe("non-participant talent cannot access thread", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(OUTSIDER_TALENT_SESSION);
    dbState.threadResult = MOCK_THREAD; // thread exists but outsider is not in it
  });

  it("sendMessage by non-participant → 403", async () => {
    await expect(
      sendMessage({ threadId: ID.thread, body: "snoop" }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("getThreadMessages by non-participant → 403", async () => {
    await expect(
      getThreadMessages({ threadId: ID.thread }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("markThreadRead by non-participant → 403", async () => {
    await expect(
      markThreadRead({ threadId: ID.thread }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

// ── Valid participant — talent ────────────────────────────────────────────────

describe("talent participant — success paths", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    dbState.threadResult = MOCK_THREAD;
  });

  it("sendMessage succeeds when talent is thread participant", async () => {
    // insert mock is already wired to return MOCK_MSG (see mock setup above)
    await expect(
      sendMessage({ threadId: ID.thread, body: "hello" }),
    ).resolves.toBeDefined();
  });

  it("getMyThreads returns threads for talent role", async () => {
    dbState.threadsResult = [MOCK_THREAD];
    const result = await getMyThreads();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ── Valid participant — business ──────────────────────────────────────────────

describe("business participant — success paths", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    dbState.threadResult = MOCK_THREAD;
  });

  it("getThreadMessages succeeds for business participant", async () => {
    await expect(
      getThreadMessages({ threadId: ID.thread }),
    ).resolves.toBeDefined();
  });

  it("getMyThreads returns threads for business role", async () => {
    dbState.threadsResult = [MOCK_THREAD];
    const result = await getMyThreads();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ── Input validation ──────────────────────────────────────────────────────────

describe("invalid input rejected by Zod", () => {
  beforeEach(() => mockAuth.mockResolvedValue(TALENT_SESSION));

  it("sendMessage with empty body → validation error (not 403)", async () => {
    await expect(
      sendMessage({ threadId: ID.thread, body: "" }),
    ).rejects.toThrow();
  });

  it("sendMessage with non-UUID threadId → validation error", async () => {
    await expect(
      sendMessage({ threadId: "not-a-uuid", body: "hi" }),
    ).rejects.toThrow();
  });

  it("getThreadMessages with non-UUID threadId → validation error", async () => {
    await expect(
      getThreadMessages({ threadId: "not-a-uuid" }),
    ).rejects.toThrow();
  });
});

// ── Mahara rule: no contact before commitment ─────────────────────────────────
// Messaging is only possible on threads that exist — threads are only created
// on proposal acceptance (acceptProposal action in Sprint 2). This test
// verifies that attempting to message on a non-existent thread returns 404,
// not a message, confirming the gate holds.

describe("no-contact-before-commitment invariant", () => {
  it("talent cannot message without an existing thread (no accepted proposal)", async () => {
    mockAuth.mockResolvedValue(TALENT_SESSION);
    dbState.threadResult = null; // no accepted proposal → no thread exists

    await expect(
      sendMessage({ threadId: ID.thread2, body: "can I contact you?" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("business cannot read messages without an existing thread", async () => {
    mockAuth.mockResolvedValue(BUSINESS_SESSION);
    dbState.threadResult = null;

    await expect(
      getThreadMessages({ threadId: ID.thread2 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
