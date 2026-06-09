import {
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notification";
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

function asUser(id: string, role: "talent" | "business" | "admin") {
  vi.mocked(auth).mockResolvedValue({
    user: { id, role, name: "Test User", email: `${id}@test.ma` },
    // biome-ignore lint/suspicious/noExplicitAny: minimal session shape
  } as any);
}

function noSession() {
  // biome-ignore lint/suspicious/noExplicitAny: Auth.js overloads require cast for null
  vi.mocked(auth).mockResolvedValue(null as any);
}

// ── 1. getUnreadCount ─────────────────────────────────────────────────────────

describe("getUnreadCount", () => {
  it("returns 0 when no unread notifications", async () => {
    asUser("user-1", "talent");
    currentMockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    };
    const result = await getUnreadCount();
    expect(result).toEqual({ count: 0 });
  });

  it("returns the correct unread count", async () => {
    asUser("user-1", "talent");
    currentMockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 7 }]),
      }),
    };
    const result = await getUnreadCount();
    expect(result).toEqual({ count: 7 });
  });

  it("returns 0 when DB returns null/undefined count", async () => {
    asUser("user-1", "talent");
    currentMockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: null }]),
      }),
    };
    const result = await getUnreadCount();
    expect(result).toEqual({ count: 0 });
  });

  it("throws 401 when unauthenticated", async () => {
    noSession();
    await expect(getUnreadCount()).rejects.toMatchObject({ status: 401 });
  });
});

// ── 2. markAllNotificationsRead ───────────────────────────────────────────────

describe("markAllNotificationsRead", () => {
  it("returns ok:true on success", async () => {
    asUser("user-1", "talent");
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    currentMockTx = {
      update: vi.fn().mockReturnValue(updateChain),
    };
    const result = await markAllNotificationsRead();
    expect(result).toEqual({ ok: true });
  });

  it("only issues update — not a select", async () => {
    asUser("user-1", "business");
    const updateFn = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    });
    currentMockTx = { update: updateFn };
    await markAllNotificationsRead();
    expect(updateFn).toHaveBeenCalledOnce();
  });

  it("throws 401 when unauthenticated", async () => {
    noSession();
    await expect(markAllNotificationsRead()).rejects.toMatchObject({ status: 401 });
  });
});

// ── 3. markNotificationRead ───────────────────────────────────────────────────

describe("markNotificationRead", () => {
  const notificationId = "00000000-0000-0000-0000-000000000001";

  it("returns the updated notification", async () => {
    asUser("user-1", "talent");
    const notif = { id: notificationId, userId: "user-1", readAt: null };
    const updated = { ...notif, readAt: new Date() };
    currentMockTx = {
      query: {
        notifications: { findFirst: vi.fn().mockResolvedValue(notif) },
      },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    };
    const result = await markNotificationRead({ notificationId });
    expect(result).toMatchObject({ id: notificationId });
  });

  it("returns early (no update) when notification already read", async () => {
    asUser("user-1", "talent");
    const alreadyRead = { id: notificationId, userId: "user-1", readAt: new Date() };
    const updateFn = vi.fn();
    currentMockTx = {
      query: {
        notifications: { findFirst: vi.fn().mockResolvedValue(alreadyRead) },
      },
      update: updateFn,
    };
    const result = await markNotificationRead({ notificationId });
    expect(result).toMatchObject({ readAt: alreadyRead.readAt });
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("throws 404 when notification not found or belongs to another user", async () => {
    asUser("user-1", "talent");
    currentMockTx = {
      query: {
        notifications: { findFirst: vi.fn().mockResolvedValue(null) },
      },
    };
    await expect(markNotificationRead({ notificationId })).rejects.toMatchObject({ status: 404 });
  });

  it("throws 401 when unauthenticated", async () => {
    noSession();
    await expect(markNotificationRead({ notificationId })).rejects.toMatchObject({ status: 401 });
  });
});
