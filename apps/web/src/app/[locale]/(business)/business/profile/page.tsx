import { BusinessProfileForm } from "@/components/profile/business-profile-form";
import { auth } from "@/lib/auth";
import { businessProfiles, db } from "@mahara/db";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function BusinessProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "business") redirect("/");

  const t = await getTranslations("profile.business");

  const profile = await db.query.businessProfiles.findFirst({
    where: eq(businessProfiles.userId, session.user.id),
  });

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="mb-8 text-2xl font-bold text-mahara-green">{t("edit_title")}</h1>
      <BusinessProfileForm initialProfile={profile} />
    </main>
  );
}
