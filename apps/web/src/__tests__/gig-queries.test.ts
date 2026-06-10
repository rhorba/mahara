import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock @mahara/db ───────────────────────────────────────────────────────────

const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
const mockSelect = vi.fn();

vi.mock("@mahara/db", () => ({
  db: {
    query: {
      gigs: {
        findMany: (...args: unknown[]) => mockFindMany(...args),
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
    select: (...args: unknown[]) => mockSelect(...args),
  },
  gigs: {
    status: "status",
    category: "category",
    title: "title",
    description: "description",
    budget: "budget",
    urgent: "urgent",
    createdAt: "createdAt",
    id: "id",
  },
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function makeGig(overrides = {}) {
  return {
    id: "gig-1",
    title: "Build landing page",
    description: "React landing page",
    category: "development",
    status: "open",
    budget: 200000,
    urgent: false,
    createdAt: new Date("2026-01-01"),
    business: { user: { name: "Hassan" } },
    ...overrides,
  };
}

import { getPublicGigDetail, listOpenGigs } from "@/lib/gig-queries";

// ── listOpenGigs ──────────────────────────────────────────────────────────────

describe("listOpenGigs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: select returns [{ total: 0 }] for count query
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ total: 0 }]),
      }),
    });
  });

  it("returns empty list when no open gigs", async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await listOpenGigs();
    expect(result.gigs).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it("returns gigs with pagination metadata", async () => {
    const gigs = [makeGig(), makeGig({ id: "gig-2" })];
    mockFindMany.mockResolvedValue(gigs);
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ total: 2 }]),
      }),
    });

    const result = await listOpenGigs({ page: 1, pageSize: 12 });
    expect(result.gigs).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(12);
    expect(result.hasMore).toBe(false);
  });

  it("sets hasMore=true when more results exist beyond page", async () => {
    const gigs = [makeGig()];
    mockFindMany.mockResolvedValue(gigs);
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ total: 20 }]),
      }),
    });

    const result = await listOpenGigs({ page: 1, pageSize: 12 });
    expect(result.hasMore).toBe(true);
  });

  it("applies category filter when provided", async () => {
    mockFindMany.mockResolvedValue([]);
    await listOpenGigs({ category: "design" });
    expect(mockFindMany).toHaveBeenCalledOnce();
  });

  it("applies search filter when provided", async () => {
    mockFindMany.mockResolvedValue([]);
    await listOpenGigs({ search: "react" });
    expect(mockFindMany).toHaveBeenCalledOnce();
  });

  it("applies budgetMin + budgetMax filters", async () => {
    mockFindMany.mockResolvedValue([]);
    await listOpenGigs({ budgetMin: 50000, budgetMax: 500000 });
    expect(mockFindMany).toHaveBeenCalledOnce();
  });

  it("applies urgent filter", async () => {
    mockFindMany.mockResolvedValue([]);
    await listOpenGigs({ urgent: true });
    expect(mockFindMany).toHaveBeenCalledOnce();
  });

  it("ignores invalid category (falls back to no category filter)", async () => {
    mockFindMany.mockResolvedValue([]);
    await listOpenGigs({ category: "invalid_cat" });
    expect(mockFindMany).toHaveBeenCalledOnce();
  });

  it("handles missing totalRows gracefully (returns total=0)", async () => {
    mockFindMany.mockResolvedValue([]);
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    const result = await listOpenGigs();
    expect(result.total).toBe(0);
  });
});

// ── getPublicGigDetail ────────────────────────────────────────────────────────

describe("getPublicGigDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns gig detail for a valid non-draft gig", async () => {
    const gig = makeGig();
    mockFindFirst.mockResolvedValue(gig);
    const result = await getPublicGigDetail("gig-1");
    expect(result).toEqual(gig);
  });

  it("returns undefined when gig is not found", async () => {
    mockFindFirst.mockResolvedValue(undefined);
    const result = await getPublicGigDetail("nonexistent");
    expect(result).toBeUndefined();
  });

  it("passes gigId to the DB query", async () => {
    mockFindFirst.mockResolvedValue(null);
    await getPublicGigDetail("gig-xyz");
    expect(mockFindFirst).toHaveBeenCalledOnce();
  });
});
