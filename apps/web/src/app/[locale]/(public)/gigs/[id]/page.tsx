import { ApplyButton } from "@/components/gigs/apply-button";
import { TopTalentPanel } from "@/components/matching/top-talent-panel";
import { ReviewForm } from "@/components/reviews/review-form";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getPublicGigDetail } from "@/lib/gig-queries";

export const revalidate = 60;
import type { Money } from "@mahara/core";
import { formatMoney } from "@mahara/core";
import { db, escrows, proposals, reviews, talentProfiles } from "@mahara/db";
import { getTopTalentForGig } from "@mahara/matching";
import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const gig = await getPublicGigDetail(id);
  if (!gig) return { title: "Mission introuvable — Mahara" };
  return { title: `${gig.title} — Mahara` };
}

export default async function PublicGigDetailPage({ params }: Props) {
  const { locale, id } = await params;

  const [t, tCat, tStatus, session] = await Promise.all([
    getTranslations("gigs"),
    getTranslations("gigs.categories"),
    getTranslations("gigs.status"),
    auth(),
  ]);

  const gig = await getPublicGigDetail(id);
  if (!gig) notFound();

  // Top-5 matched talent (shown to business owners and admins; hidden from public)
  const userId = session?.user?.id;
  const role = session?.user?.role;

  const topTalent =
    role === "business" || role === "admin" ? await getTopTalentForGig(gig.id, 5) : [];

  // Check if talent has already applied
  let hasApplied = false;
  if (userId && role === "talent") {
    const talentProfile = await db.query.talentProfiles.findFirst({
      where: eq(talentProfiles.userId, userId),
    });
    if (talentProfile) {
      const existing = await db.query.proposals.findFirst({
        where: and(eq(proposals.gigId, gig.id), eq(proposals.talentId, talentProfile.id)),
      });
      hasApplied = !!existing;
    }
  }

  // Review section: show for completed gigs where user is a party
  let canReview = false;
  let hasReviewed = false;
  if (userId && gig.status === "completed" && (role === "talent" || role === "business")) {
    const escrow = await db.query.escrows.findFirst({ where: eq(escrows.gigId, gig.id) });
    if (escrow) {
      canReview = escrow.businessId === userId || escrow.talentId === userId;
      if (canReview) {
        const existing = await db.query.reviews.findFirst({
          where: and(eq(reviews.gigId, gig.id), eq(reviews.reviewerId, userId)),
        });
        hasReviewed = !!existing;
      }
    }
  }

  const deadline = gig.deadline
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(gig.deadline),
      )
    : null;

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back link */}
      <Link
        href="/gigs"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-mahara-green mb-6 transition-colors"
      >
        ← {t("back_to_gigs")}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title + badges */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs px-2.5 py-1 bg-mahara-green/10 text-mahara-green rounded-full font-medium">
                {tCat(gig.category)}
              </span>
              <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                {tStatus(gig.status)}
              </span>
              {gig.urgent && (
                <span className="text-xs px-2.5 py-1 bg-mahara-gold/10 text-mahara-gold rounded-full font-medium">
                  {t("urgent_badge")}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-display font-bold text-gray-900">{gig.title}</h1>
          </div>

          {/* Description */}
          <section>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{gig.description}</p>
          </section>

          {/* Skills */}
          {gig.skills.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {t("skills_required")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {gig.skills.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1 bg-gray-50 border border-gray-100 text-sm text-gray-700 rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Review form (completed gig, authenticated party, not yet reviewed) */}
          {canReview && (
            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              {hasReviewed ? (
                <p className="text-sm text-gray-400">
                  {(await getTranslations("reviews"))("already_reviewed")}
                </p>
              ) : (
                <ReviewForm gigId={gig.id} gigTitle={gig.title} />
              )}
            </section>
          )}

          {/* Top-5 talent (visible to business/admin only) */}
          {topTalent.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t("top_talent_for_gig")}
              </h2>
              <TopTalentPanel talent={topTalent} locale={locale} />
            </section>
          )}

          {/* Business */}
          <section className="rounded-xl border border-gray-100 p-4 bg-gray-50">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t("posted_by")}</p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-mahara-green/10 flex items-center justify-center text-mahara-green font-bold text-sm">
                {gig.business?.user?.name?.[0]?.toUpperCase() ?? "B"}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {gig.business?.companyName ?? gig.business?.user?.name}
                </p>
                <p className="text-xs text-gray-400">
                  {gig.business?.user?.city ?? "Maroc"}
                  {gig.business?.verifiedBusiness && (
                    <span className="ms-1.5 text-mahara-green">✓ {t("verified_badge")}</span>
                  )}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Budget + meta */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                {t("budget_label")}
              </p>
              <p className="text-2xl font-bold text-mahara-green">
                {formatMoney(gig.budget as Money, locale)}
              </p>
            </div>

            {gig.duration && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  {t("duration_label")}
                </p>
                <p className="text-sm text-gray-700">{gig.duration}</p>
              </div>
            )}

            {deadline && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  {t("deadline_label")}
                </p>
                <p className="text-sm text-gray-700">{deadline}</p>
              </div>
            )}

            <hr className="border-gray-100" />

            <ApplyButton
              gigId={gig.id}
              isAuthenticated={!!userId}
              isTalent={role === "talent"}
              hasApplied={hasApplied}
            />

            <p className="text-xs text-gray-400 text-center leading-relaxed">{t("escrow_note")}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
