import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

// Google OAuth new-user landing. Sprint 0: redirect to role-based dashboard.
// Sprint 1+: render a profile-completion wizard here.
export default async function OnboardingPage() {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user) redirect(`/${locale}/auth/login`);
  redirect(`/${locale}/auth/redirect`);
}
