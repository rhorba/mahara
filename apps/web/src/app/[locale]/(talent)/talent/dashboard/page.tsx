import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { db, talentProfiles } from "@mahara/db";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function TalentDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "talent") redirect("/");

  const t = await getTranslations("profile.talent");

  const profile = await db.query.talentProfiles.findFirst({
    where: eq(talentProfiles.userId, session.user.id),
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-mahara-green">
        Bonjour, {session.user.name ?? "Talent"} 👋
      </h1>

      {!profile && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Votre profil est incomplet.{" "}
          <Link href="/talent/profile" className="font-semibold underline">
            Complétez-le maintenant
          </Link>{" "}
          pour apparaître dans les résultats de recherche.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label={t("completed_gigs")} value={profile?.completedGigs ?? 0} />
        <StatCard label={t("reviews")} value={profile?.reviewCount ?? 0} />
        <StatCard label={t("response_rate")} value={`${profile?.responseRate ?? 0}%`} />
        <StatCard label={t("on_time_rate")} value={`${profile?.onTimeRate ?? 0}%`} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/talent/profile"
          className="px-4 py-2 bg-mahara-green text-white rounded-lg text-sm font-medium hover:bg-mahara-green/90 transition-colors"
        >
          {profile ? t("edit_title") : "Créer mon profil"}
        </Link>
        <Link
          href="/gigs"
          className="px-4 py-2 border border-mahara-green text-mahara-green rounded-lg text-sm font-medium hover:bg-mahara-green/5 transition-colors"
        >
          Voir les offres
        </Link>
        <Link
          href="/talent/proposals"
          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Mes candidatures
        </Link>
        <Link
          href="/talent/messages"
          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Messagerie
        </Link>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="text-2xl font-bold text-mahara-green">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5 capitalize">{label}</div>
    </div>
  );
}
