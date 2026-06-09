import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import type { Money } from "@mahara/core";
import { formatMoney } from "@mahara/core";
import { businessProfiles, db, gigs } from "@mahara/db";
import { and, desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function BusinessGigsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "business") redirect("/");

  const [t, tCat, tStatus] = await Promise.all([
    getTranslations("gigs"),
    getTranslations("gigs.categories"),
    getTranslations("gigs.status"),
  ]);

  const businessProfile = await db.query.businessProfiles.findFirst({
    where: eq(businessProfiles.userId, session.user.id),
  });

  const myGigs = businessProfile
    ? await db.query.gigs.findMany({
        where: and(eq(gigs.businessId, businessProfile.id)),
        orderBy: [desc(gigs.updatedAt)],
      })
    : [];

  const STATUS_PILL: Record<string, string> = {
    draft: "bg-gray-100 text-gray-500",
    open: "bg-green-100 text-green-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-mahara-green/10 text-mahara-green",
    cancelled: "bg-red-50 text-red-500",
    disputed: "bg-orange-100 text-orange-700",
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-mahara-green">{t("my_gigs")}</h1>
        <Link
          href="/business/gigs/new"
          className="px-4 py-2 bg-mahara-green text-white text-sm font-semibold rounded-lg hover:bg-mahara-green/90 transition-colors"
        >
          + {t("new_gig")}
        </Link>
      </div>

      {myGigs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-4">{t("no_gigs")}</p>
          <Link
            href="/business/gigs/new"
            className="px-5 py-2.5 bg-mahara-green text-white rounded-lg text-sm font-semibold hover:bg-mahara-green/90 transition-colors"
          >
            + {t("new_gig")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myGigs.map((gig) => (
            <Link
              key={gig.id}
              href={`/business/gigs/${gig.id}`}
              className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-sm hover:border-mahara-green/20 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[gig.status] ?? "bg-gray-100 text-gray-500"}`}
                  >
                    {tStatus(gig.status)}
                  </span>
                  {gig.urgent && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-mahara-gold/10 text-mahara-gold font-medium">
                      {t("urgent_badge")}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-900 truncate">{gig.title}</p>
                <p className="text-xs text-gray-400">
                  {tCat(gig.category)} · {formatMoney(gig.budget as Money, "fr")}
                </p>
              </div>
              <span className="text-mahara-green text-sm shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
