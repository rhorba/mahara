import { TalentProposalActions } from "@/components/gigs/proposal-actions";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import type { Money } from "@mahara/core";
import { formatMoney } from "@mahara/core";
import { db, proposals, talentProfiles } from "@mahara/db";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function TalentProposalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "talent") redirect("/");

  const [t, tCat, tProp, tPropStatus] = await Promise.all([
    getTranslations("gigs"),
    getTranslations("gigs.categories"),
    getTranslations("gigs.proposals"),
    getTranslations("gigs.proposals.status"),
  ]);

  const talentProfile = await db.query.talentProfiles.findFirst({
    where: eq(talentProfiles.userId, session.user.id),
  });

  const myProposals = talentProfile
    ? await db.query.proposals.findMany({
        where: eq(proposals.talentId, talentProfile.id),
        with: {
          gig: {
            with: { business: { with: { user: true } } },
          },
        },
        orderBy: [desc(proposals.createdAt)],
      })
    : [];

  const STATUS_PILL: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-gray-100 text-gray-400",
    withdrawn: "bg-gray-100 text-gray-400",
  };

  const pending = myProposals.filter((p) => p.status === "pending");
  const accepted = myProposals.filter((p) => p.status === "accepted");
  const other = myProposals.filter((p) => p.status !== "pending" && p.status !== "accepted");

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-display font-bold text-mahara-green mb-6">
        {tProp("title")}
      </h1>

      {myProposals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-4">{tProp("empty")}</p>
          <Link
            href="/gigs"
            className="px-5 py-2.5 bg-mahara-green text-white rounded-lg text-sm font-semibold hover:bg-mahara-green/90 transition-colors"
          >
            {t("title")}
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {accepted.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {tPropStatus("accepted")} ({accepted.length})
              </h2>
              <div className="space-y-3">
                {accepted.map((proposal) => {
                  const gig = proposal.gig;
                  return (
                    <div
                      key={proposal.id}
                      className="rounded-xl border border-mahara-green/40 bg-mahara-green/5 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                              {tPropStatus("accepted")}
                            </span>
                            {gig && <span className="text-xs text-gray-400">{tCat(gig.category)}</span>}
                          </div>
                          <Link
                            href={`/gigs/${gig?.id}`}
                            className="font-semibold text-gray-900 hover:text-mahara-green transition-colors"
                          >
                            {gig?.title ?? "—"}
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {gig?.business?.user?.name ?? gig?.business?.companyName ?? "—"}
                          </p>
                        </div>
                        {gig && (
                          <p className="text-sm font-bold text-mahara-green shrink-0">
                            {formatMoney(gig.budget as Money, "fr")}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Link
                          href={`/gigs/${gig?.id}`}
                          className="text-xs px-3 py-1.5 bg-mahara-green text-white rounded-lg font-medium hover:bg-mahara-green/90 transition-colors"
                        >
                          {tProp("message")}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {pending.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {tPropStatus("pending")} ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((proposal) => {
                  const gig = proposal.gig;
                  return (
                    <div
                      key={proposal.id}
                      className="rounded-xl border border-gray-100 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL["pending"]}`}
                            >
                              {tPropStatus("pending")}
                            </span>
                            {gig && <span className="text-xs text-gray-400">{tCat(gig.category)}</span>}
                          </div>
                          <Link
                            href={`/gigs/${gig?.id}`}
                            className="font-semibold text-gray-900 hover:text-mahara-green transition-colors"
                          >
                            {gig?.title ?? "—"}
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {gig?.business?.user?.name ?? gig?.business?.companyName ?? "—"}
                          </p>
                        </div>
                        <div className="text-end shrink-0">
                          {gig && (
                            <p className="text-sm font-bold text-mahara-green">
                              {formatMoney(gig.budget as Money, "fr")}
                            </p>
                          )}
                          {proposal.proposedBudget && (
                            <p className="text-xs text-gray-400">
                              {tProp("proposed_budget")}:{" "}
                              {formatMoney(proposal.proposedBudget as Money, "fr")}
                            </p>
                          )}
                        </div>
                      </div>
                      {proposal.coverLetter && (
                        <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 line-clamp-2">
                          {proposal.coverLetter}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                          {new Intl.DateTimeFormat("fr", { day: "numeric", month: "short" }).format(
                            new Date(proposal.createdAt),
                          )}
                        </p>
                        <TalentProposalActions proposalId={proposal.id} status={proposal.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {other.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Historique ({other.length})
              </h2>
              <div className="space-y-3">
                {other.map((proposal) => {
                  const gig = proposal.gig;
                  return (
                    <div
                      key={proposal.id}
                      className="rounded-xl border border-gray-100 bg-white p-4 opacity-70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[proposal.status] ?? "bg-gray-100 text-gray-400"}`}
                            >
                              {tPropStatus(proposal.status)}
                            </span>
                            {gig && <span className="text-xs text-gray-400">{tCat(gig.category)}</span>}
                          </div>
                          <p className="font-semibold text-gray-700">{gig?.title ?? "—"}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {gig?.business?.user?.name ?? "—"}
                          </p>
                        </div>
                        {gig && (
                          <p className="text-sm font-semibold text-gray-500 shrink-0">
                            {formatMoney(gig.budget as Money, "fr")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
