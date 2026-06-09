import { BusinessProposalActions } from "@/components/gigs/proposal-actions";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";
import { EscrowStatusBanner } from "@/components/payments/escrow-status-banner";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import type { Money, SkillEntry } from "@mahara/core";
import { formatMoney } from "@mahara/core";
import { businessProfiles, db, escrows, gigs, proposals } from "@mahara/db";
import { and, desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<Record<string, string>>;
};

export default async function BusinessGigDetailPage({ params }: Props) {
  const { id, locale } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "business") redirect("/");

  const [t, tCat, tStatus, tProp, tPropStatus] = await Promise.all([
    getTranslations("gigs"),
    getTranslations("gigs.categories"),
    getTranslations("gigs.status"),
    getTranslations("gigs.proposals"),
    getTranslations("gigs.proposals.status"),
  ]);

  // Load escrow for this gig (may not exist yet — pending proposal acceptance)
  const escrow = await db.query.escrows.findFirst({
    where: eq(escrows.gigId, id),
  });

  const businessProfile = await db.query.businessProfiles.findFirst({
    where: eq(businessProfiles.userId, session.user.id),
  });
  if (!businessProfile) redirect("/business/profile");

  const gig = await db.query.gigs.findFirst({
    where: and(eq(gigs.id, id), eq(gigs.businessId, businessProfile.id)),
  });
  if (!gig) notFound();

  const gigProposals = await db.query.proposals.findMany({
    where: eq(proposals.gigId, gig.id),
    with: { talent: { with: { user: true } } },
    orderBy: [desc(proposals.matchScore), desc(proposals.createdAt)],
  });

  const STATUS_PILL: Record<string, string> = {
    draft: "bg-gray-100 text-gray-500",
    open: "bg-green-100 text-green-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-mahara-green/10 text-mahara-green",
    cancelled: "bg-red-50 text-red-500",
    disputed: "bg-orange-100 text-orange-700",
  };

  const PROP_STATUS_PILL: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-gray-100 text-gray-400",
    withdrawn: "bg-gray-100 text-gray-400",
  };

  const VERIF_COLORS: Record<string, string> = {
    top_talent: "bg-mahara-gold/10 text-mahara-gold",
    verified: "bg-mahara-green/10 text-mahara-green",
    pending: "bg-blue-50 text-blue-600",
    unverified: "bg-gray-50 text-gray-400",
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back */}
      <Link
        href="/business/gigs"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-mahara-green mb-6 transition-colors"
      >
        ← {t("my_gigs")}
      </Link>

      {/* Gig header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_PILL[gig.status] ?? "bg-gray-100 text-gray-500"}`}
              >
                {tStatus(gig.status)}
              </span>
              <span className="text-xs px-2.5 py-0.5 bg-mahara-green/10 text-mahara-green rounded-full font-medium">
                {tCat(gig.category)}
              </span>
              {gig.urgent && (
                <span className="text-xs px-2.5 py-0.5 bg-mahara-gold/10 text-mahara-gold rounded-full font-medium">
                  {t("urgent_badge")}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{gig.title}</h1>
          </div>
          <div className="text-end">
            <p className="text-2xl font-bold text-mahara-green">
              {formatMoney(gig.budget as Money, "fr")}
            </p>
            {gig.duration && <p className="text-xs text-gray-400">{gig.duration}</p>}
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-600 leading-relaxed line-clamp-3">{gig.description}</p>

        {gig.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {gig.skills.map((s) => (
              <span
                key={s}
                className="text-xs px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full text-gray-600"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Escrow status banner */}
      {escrow && (
        <EscrowStatusBanner
          escrowId={escrow.id}
          gigId={gig.id}
          escrowStatus={
            escrow.status as "pending" | "funded" | "released" | "refunded" | "disputed"
          }
          gigStatus={
            gig.status as "draft" | "open" | "in_progress" | "completed" | "cancelled" | "disputed"
          }
          grossAmount={escrow.grossAmount}
          platformFeeFromBusiness={escrow.platformFeeFromBusiness}
          platformFeeFromTalent={escrow.platformFeeFromTalent}
          talentPayout={escrow.talentPayout}
          userRole="business"
          locale={locale}
        />
      )}

      {/* Proposals */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {tProp("business_title")}{" "}
          <span className="text-sm font-normal text-gray-400">({gigProposals.length})</span>
        </h2>

        {gigProposals.length === 0 ? (
          <div className="text-center py-12 text-gray-400 rounded-xl border border-dashed border-gray-200">
            {tProp("business_empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {gigProposals.map((proposal) => {
              const talentSkills = (proposal.talent?.skills as SkillEntry[]) ?? [];
              return (
                <div
                  key={proposal.id}
                  className={`rounded-xl border p-5 bg-white transition-all ${
                    proposal.status === "accepted"
                      ? "border-mahara-green/40 bg-mahara-green/5"
                      : "border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Talent info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-mahara-green/10 flex items-center justify-center text-mahara-green font-bold text-sm shrink-0">
                        {proposal.talent?.user?.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <span className="font-semibold text-sm text-gray-900">
                            {proposal.talent?.user?.name ?? "—"}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${VERIF_COLORS[proposal.talent?.verificationStatus ?? "unverified"]}`}
                          >
                            {proposal.talent?.verificationStatus === "top_talent"
                              ? t("top_talent_badge")
                              : proposal.talent?.verificationStatus === "verified"
                                ? t("verified_badge")
                                : null}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {proposal.talent?.user?.city ?? "Maroc"} ·{" "}
                          {proposal.talent?.completedGigs ?? 0} missions
                        </p>

                        {/* Match score */}
                        {proposal.matchScore > 0 && (
                          <div className="mt-1">
                            <MatchScoreBadge score={proposal.matchScore} size="sm" />
                          </div>
                        )}

                        {/* Skills */}
                        {talentSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {talentSkills.slice(0, 3).map((s) => (
                              <span
                                key={s.skill}
                                className="text-xs px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded-full"
                              >
                                {s.skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROP_STATUS_PILL[proposal.status]}`}
                      >
                        {tPropStatus(proposal.status)}
                      </span>
                      {proposal.proposedBudget && (
                        <p className="text-sm font-semibold text-gray-700">
                          {formatMoney(proposal.proposedBudget as Money, "fr")}
                        </p>
                      )}
                      {proposal.estimatedDays && (
                        <p className="text-xs text-gray-400">
                          {proposal.estimatedDays} {tProp("days")}
                        </p>
                      )}
                    </div>
                  </div>

                  {proposal.coverLetter && (
                    <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 line-clamp-3">
                      {proposal.coverLetter}
                    </p>
                  )}

                  {/* Actions row */}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Link
                      href={`/talent/${proposal.talent?.userId}`}
                      className="text-xs text-mahara-green hover:underline"
                    >
                      {t("view_profile")}
                    </Link>
                    {gig.status === "open" && (
                      <BusinessProposalActions proposalId={proposal.id} status={proposal.status} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
