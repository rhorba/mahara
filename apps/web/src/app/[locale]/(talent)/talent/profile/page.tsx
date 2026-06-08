import { TalentProfileForm } from "@/components/profile/talent-profile-form";
import { auth } from "@/lib/auth";
import { db, talentProfiles } from "@mahara/db";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function TalentProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "talent") redirect("/");

  const t = await getTranslations("profile.talent");

  const profile = await db.query.talentProfiles.findFirst({
    where: eq(talentProfiles.userId, session.user.id),
  });

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="mb-8 text-2xl font-bold text-mahara-green">{t("edit_title")}</h1>
      <TalentProfileForm initialProfile={profile} />
    </main>
  );
}
