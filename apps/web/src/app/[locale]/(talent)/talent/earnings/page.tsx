import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import type { Money } from "@mahara/core";
import { formatMoney } from "@mahara/core";
import { db, escrows, gigs } from "@mahara/db";
import { eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function TalentEarningsPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "talent") redirect("/");

  const t = await getTranslations("payments");

  const allEscrows = await db.query.escrows.findMany({
    where: eq(escrows.talentId, session.user.id),
    orderBy: (e, { desc }) => [desc(e.createdAt)],
  });

  // Load gigs for all escrows in one query
  const gigIds = [...new Set(allEscrows.map((e) => e.gigId))];
  const gigsMap: Record<string, string> = {};
  if (gigIds.length > 0) {
    const gigRows = await db.query.gigs.findMany({
      where: inArray(gigs.id, gigIds),
      columns: { id: true, title: true },
    });
    for (const g of gigRows) {
      gigsMap[g.id] = g.title;
    }
  }

  const released = allEscrows.filter((e) => e.status === "released");
  const pending = allEscrows.filter((e) => e.status === "funded");

  const totalEarned = released.reduce((sum, e) => sum + e.talentPayout, 0);
  const totalPending = pending.reduce((sum, e) => sum + e.talentPayout, 0);

  const STATUS_PILL: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    funded: "bg-blue-50 text-blue-700",
    released: "bg-mahara-green/10 text-mahara-green",
    refunded: "bg-gray-100 text-gray-500",
    disputed: "bg-orange-50 text-orange-700",
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href="/talent/dashboard"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-mahara-green mb-6 transition-colors"
      >
        ← Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-mahara-green mb-6">{t("earnings_title")}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-mahara-green/20 bg-mahara-green/5 p-5">
          <p className="text-xs text-gray-500 mb-1">{t("earnings_total")}</p>
          <p className="text-2xl font-bold text-mahara-green">
            {formatMoney(totalEarned as Money, locale)}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs text-gray-500 mb-1">{t("earnings_pending")}</p>
          <p className="text-2xl font-bold text-amber-600">
            {formatMoney(totalPending as Money, locale)}
          </p>
        </div>
      </div>

      {/* Upcoming (funded) */}
      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-700 mb-3">{t("earnings_upcoming")}</h2>
          <div className="space-y-2">
            {pending.map((escrow) => (
              <EscrowRow
                key={escrow.id}
                title={gigsMap[escrow.gigId] ?? "—"}
                amount={escrow.talentPayout}
                status="funded"
                statusPill={STATUS_PILL.funded ?? ""}
                statusLabel={t("status.funded")}
                date={escrow.fundedAt}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}

      {/* History (released / refunded / disputed) */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">{t("earnings_history")}</h2>
        {released.length === 0 && pending.length === 0 ? (
          <div className="text-center py-12 text-gray-400 rounded-xl border border-dashed border-gray-200">
            {t("earnings_empty")}
          </div>
        ) : released.length === 0 ? (
          <p className="text-sm text-gray-400">{t("earnings_empty")}</p>
        ) : (
          <div className="space-y-2">
            {released.map((escrow) => (
              <EscrowRow
                key={escrow.id}
                title={gigsMap[escrow.gigId] ?? "—"}
                amount={escrow.talentPayout}
                status="released"
                statusPill={STATUS_PILL.released ?? ""}
                statusLabel={t("status.released")}
                date={escrow.releasedAt}
                locale={locale}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function EscrowRow({
  title,
  amount,
  statusPill,
  statusLabel,
  date,
  locale,
}: {
  title: string;
  amount: number;
  status: string;
  statusPill: string;
  statusLabel: string;
  date: Date | null;
  locale: string;
}) {
  const fmtDate = date
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-MA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date)
    : "—";

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <div>
        <p className="text-sm font-medium text-gray-900 line-clamp-1">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{fmtDate}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusPill}`}>
          {statusLabel}
        </span>
        <span className="text-sm font-bold text-mahara-green">
          {formatMoney(amount as Money, locale)}
        </span>
      </div>
    </div>
  );
}
