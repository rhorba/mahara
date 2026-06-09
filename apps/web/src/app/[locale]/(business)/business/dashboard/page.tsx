import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { businessProfiles, db } from "@mahara/db";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

type Props = { searchParams?: Promise<Record<string, string>> };

export default async function BusinessDashboard({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "business") redirect("/");

  const [t, tPayments] = await Promise.all([
    getTranslations("profile.business"),
    getTranslations("payments"),
  ]);

  const sp = await searchParams;
  const paymentStatus = sp?.payment;

  const profile = await db.query.businessProfiles.findFirst({
    where: eq(businessProfiles.userId, session.user.id),
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-mahara-green">
        Bonjour, {session.user.name ?? "Entreprise"} 👋
      </h1>

      {paymentStatus === "funded" && (
        <div className="mb-6 rounded-xl border border-mahara-green/30 bg-mahara-green/5 px-4 py-3 text-sm text-mahara-green">
          {tPayments("payment_confirmed")}
        </div>
      )}

      {paymentStatus === "failed" && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {tPayments("payment_failed")}
        </div>
      )}

      {!profile && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Complétez votre profil entreprise pour pouvoir publier des offres.{" "}
          <Link href="/business/profile" className="font-semibold underline">
            Compléter maintenant
          </Link>
        </div>
      )}

      {profile && (
        <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold text-gray-900">{profile.companyName}</div>
          {profile.sector && <div className="text-sm text-gray-500 mt-0.5">{profile.sector}</div>}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/business/profile"
          className="px-4 py-2 bg-mahara-green text-white rounded-lg text-sm font-medium hover:bg-mahara-green/90 transition-colors"
        >
          {profile ? t("edit_title") : "Créer mon profil"}
        </Link>
        <Link
          href="/business/gigs"
          className="px-4 py-2 border border-mahara-green text-mahara-green rounded-lg text-sm font-medium hover:bg-mahara-green/5 transition-colors"
        >
          Mes missions
        </Link>
        <Link
          href="/business/gigs/new"
          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          + Publier une mission
        </Link>
        <Link
          href="/business/messages"
          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Messagerie
        </Link>
      </div>
    </main>
  );
}
