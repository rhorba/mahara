import { GigPostForm } from "@/components/gigs/gig-post-form";
import { auth } from "@/lib/auth";
import { businessProfiles, db } from "@mahara/db";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function NewGigPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "business") redirect("/");

  const t = await getTranslations("gigs.post");

  const businessProfile = await db.query.businessProfiles.findFirst({
    where: eq(businessProfiles.userId, session.user.id),
  });

  if (!businessProfile) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-800">
          <p className="font-semibold mb-1">{t("error_profile")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-display font-bold text-mahara-green mb-6">{t("title")}</h1>
      <GigPostForm />
    </main>
  );
}
