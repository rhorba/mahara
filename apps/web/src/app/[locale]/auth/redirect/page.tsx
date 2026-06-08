import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

// Post-auth redirect: reads role from session and sends to the right dashboard.
export default async function AuthRedirectPage() {
  const [session, locale] = await Promise.all([auth(), getLocale()]);

  if (!session?.user) redirect(`/${locale}/auth/login`);

  const { role } = session.user;
  if (role === "business") redirect(`/${locale}/business/dashboard`);
  if (role === "admin") redirect(`/${locale}/admin/dashboard`);
  redirect(`/${locale}/talent/dashboard`);
}
