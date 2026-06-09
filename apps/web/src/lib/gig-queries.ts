import { gigCategorySchema } from "@mahara/core";
import { db, gigs } from "@mahara/db";
import { and, count, desc, eq, gte, ilike, lte, ne, or } from "drizzle-orm";

export type GigFilter = {
  category?: string;
  search?: string;
  budgetMin?: number;
  budgetMax?: number;
  urgent?: boolean;
  page?: number;
  pageSize?: number;
};

export async function listOpenGigs(filter: GigFilter = {}) {
  const { category, search, budgetMin, budgetMax, urgent, page = 1, pageSize = 12 } = filter;

  const parsedCategory = gigCategorySchema.safeParse(category);

  const where = and(
    eq(gigs.status, "open"),
    parsedCategory.success ? eq(gigs.category, parsedCategory.data) : undefined,
    search
      ? or(ilike(gigs.title, `%${search}%`), ilike(gigs.description, `%${search}%`))
      : undefined,
    budgetMin !== undefined ? gte(gigs.budget, budgetMin) : undefined,
    budgetMax !== undefined ? lte(gigs.budget, budgetMax) : undefined,
    urgent === true ? eq(gigs.urgent, true) : undefined,
  );

  const offset = (page - 1) * pageSize;

  const [results, totalRows] = await Promise.all([
    db.query.gigs.findMany({
      where,
      with: { business: { with: { user: true } } },
      orderBy: [desc(gigs.urgent), desc(gigs.createdAt)],
      limit: pageSize,
      offset,
    }),
    db.select({ total: count() }).from(gigs).where(where),
  ]);

  const total = totalRows[0]?.total ?? 0;

  return {
    gigs: results,
    total,
    page,
    pageSize,
    hasMore: offset + results.length < total,
  };
}

export async function getPublicGigDetail(gigId: string) {
  return db.query.gigs.findFirst({
    where: and(eq(gigs.id, gigId), ne(gigs.status, "draft")),
    with: {
      business: { with: { user: true } },
    },
  });
}
