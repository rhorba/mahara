import { getAdminKPIs } from "@/app/actions/admin";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

function fmtMAD(centimes: number): string {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(centimes / 100);
}

export default async function AdminDashboard() {
  const [t, kpis] = await Promise.all([
    getTranslations("admin.dashboard"),
    getAdminKPIs({}).catch(() => null),
  ]);

  const gmv = kpis ? fmtMAD(kpis.gmvCentimes) : "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-mahara-green">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label={t("gmv")} value={gmv} highlight />
        <KpiCard label={t("active_gigs")} value={String(kpis?.activeGigs ?? "—")} />
        <KpiCard label={t("in_progress_gigs")} value={String(kpis?.inProgressGigs ?? "—")} />
        <KpiCard label={t("completed_gigs")} value={String(kpis?.completedGigs ?? "—")} />
        <KpiCard label={t("new_signups")} value={String(kpis?.newSignups30d ?? "—")} />
        <KpiCard label={t("completion_rate")} value={kpis ? `${kpis.completionRate}%` : "—"} />
        <KpiCard
          label={t("disputed_escrows")}
          value={String(kpis?.disputedEscrows ?? "—")}
          alert={(kpis?.disputedEscrows ?? 0) > 0}
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400">
          {t("quick_actions")}
        </h2>
        <div className="flex flex-wrap gap-3">
          <QuickLink href="/admin/verifications" label={t("goto_verifications")} />
          <QuickLink href="/admin/escrow" label={t("goto_escrow")} />
          <QuickLink href="/admin/disputes" label={t("goto_disputes")} />
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  highlight,
  alert,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        alert
          ? "border-red-200 bg-red-50"
          : highlight
            ? "border-mahara-green bg-mahara-green text-white"
            : "border-gray-100 bg-white"
      }`}
    >
      <p
        className={`text-xs font-medium ${
          highlight ? "text-mahara-green-pale" : alert ? "text-red-500" : "text-gray-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold ${
          highlight ? "text-white" : alert ? "text-red-600" : "text-mahara-green"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-mahara-green px-4 py-2 text-sm font-medium text-mahara-green transition hover:bg-mahara-green hover:text-white"
    >
      {label}
    </Link>
  );
}
