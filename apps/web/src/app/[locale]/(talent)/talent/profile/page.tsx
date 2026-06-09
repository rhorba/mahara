import { TalentProfileForm } from "@/components/profile/talent-profile-form";
import { VerificationRequestPanel } from "@/components/trust/verification-request";
import { auth } from "@/lib/auth";
import type { SkillEntry } from "@mahara/core";
import { db, skillVerifications, talentProfiles } from "@mahara/db";
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

  const verificationRequests = profile
    ? await db.query.skillVerifications.findMany({
        where: eq(skillVerifications.talentId, profile.id),
        orderBy: (sv, { desc }) => [desc(sv.createdAt)],
      })
    : [];

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-mahara-green">{t("edit_title")}</h1>
      <TalentProfileForm initialProfile={profile} />

      {profile && (
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <VerificationRequestPanel
            skills={(profile.skills as SkillEntry[]) ?? []}
            existingRequests={verificationRequests}
          />
        </section>
      )}
    </main>
  );
}
