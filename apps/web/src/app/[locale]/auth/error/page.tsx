import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function AuthErrorPage() {
  const t = useTranslations("errors");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="mb-6 text-gray-600">{t("server_error")}</p>
        <Link
          href="/auth/login"
          className="rounded-lg bg-mahara-green px-6 py-2 text-sm font-semibold text-white transition hover:bg-mahara-green-light"
        >
          {t("unauthorized")}
        </Link>
      </div>
    </main>
  );
}
