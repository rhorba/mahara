import { Link } from "@/i18n/navigation";
import { listOpenGigs } from "@/lib/gig-queries";
import type { Money } from "@mahara/core";
import { formatMoney } from "@mahara/core";
import { getTranslations } from "next-intl/server";

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category?: string;
    search?: string;
    page?: string;
    urgent?: string;
  }>;
};

const CATEGORIES = [
  "design",
  "development",
  "marketing",
  "data",
  "content",
  "translation",
  "admin",
  "other",
] as const;

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-500",
};

export default async function GigBrowsePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { category, search, page: pageStr, urgent } = await searchParams;

  const [t, tCat] = await Promise.all([
    getTranslations("gigs"),
    getTranslations("gigs.categories"),
  ]);

  const page = Math.max(1, Number(pageStr ?? 1) || 1);

  const { gigs, total, hasMore } = await listOpenGigs({
    category,
    search,
    urgent: urgent === "1",
    page,
    pageSize: 12,
  });

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (category && !("category" in params)) sp.set("category", category);
    if (search && !("search" in params)) sp.set("search", search);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    return `/${locale}/gigs${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-mahara-green mb-1">{t("title")}</h1>
        <p className="text-gray-500 text-sm">
          {total} {t("applicants")}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        {/* Search */}
        <form method="get" action={`/${locale}/gigs`}>
          {category && <input type="hidden" name="category" value={category} />}
          <div className="flex gap-2">
            <input
              name="search"
              defaultValue={search}
              placeholder={t("search_placeholder")}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-mahara-green text-white text-sm font-medium rounded-lg hover:bg-mahara-green/90 transition-colors"
            >
              &#128269;
            </button>
          </div>
        </form>

        {/* Category chips */}
        <div className="flex gap-2 flex-wrap">
          <Link
            href={buildUrl({ category: undefined, page: undefined })}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !category
                ? "bg-mahara-green text-white"
                : "border border-gray-200 text-gray-600 hover:border-mahara-green"
            }`}
          >
            {tCat("all")}
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={buildUrl({ category: cat, page: undefined })}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === cat
                  ? "bg-mahara-green text-white"
                  : "border border-gray-200 text-gray-600 hover:border-mahara-green"
              }`}
            >
              {tCat(cat)}
            </Link>
          ))}
        </div>

        {/* Urgent toggle */}
        <Link
          href={buildUrl({ urgent: urgent === "1" ? undefined : "1", page: undefined })}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            urgent === "1"
              ? "bg-mahara-gold/10 border-mahara-gold text-mahara-gold"
              : "border-gray-200 text-gray-600 hover:border-mahara-gold"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${urgent === "1" ? "bg-mahara-gold" : "bg-gray-400"}`}
          />
          {t("urgent_badge")}
        </Link>
      </div>

      {/* Gig grid */}
      {gigs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">{t("no_results")}</p>
          <Link
            href={`/${locale}/gigs`}
            className="mt-4 inline-block text-sm text-mahara-green hover:underline"
          >
            {tCat("all")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gigs.map((gig) => (
            <Link
              key={gig.id}
              href={`/gigs/${gig.id}`}
              className="group block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-mahara-green/30 transition-all"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS.open}`}
                >
                  {tCat(gig.category)}
                </span>
                {gig.urgent && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-mahara-gold/10 text-mahara-gold font-medium">
                    {t("urgent_badge")}
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-mahara-green transition-colors">
                {gig.title}
              </h2>

              {/* Business */}
              <p className="text-xs text-gray-400 mb-3">
                {gig.business?.user?.name ?? "—"} · {gig.business?.user?.city ?? "Maroc"}
              </p>

              {/* Skills */}
              {gig.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {gig.skills.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                  {gig.skills.length > 3 && (
                    <span className="text-xs px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full">
                      +{gig.skills.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <span className="text-mahara-green font-bold text-sm">
                  {formatMoney(gig.budget as Money, locale)}
                </span>
                {gig.duration && <span className="text-xs text-gray-400">{gig.duration}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div className="mt-8 flex justify-center gap-3">
          {page > 1 && (
            <Link
              href={buildUrl({ page: String(page - 1) })}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              ← Précédent
            </Link>
          )}
          {hasMore && (
            <Link
              href={buildUrl({ page: String(page + 1) })}
              className="px-4 py-2 bg-mahara-green text-white rounded-lg text-sm font-medium hover:bg-mahara-green/90 transition-colors"
            >
              Suivant →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
