import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-mahara-green p-8">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-5xl font-bold text-white">{t("headline")}</h1>
        <p className="mb-8 text-xl text-green-100">{t("subheadline")}</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/auth/signup?role=talent"
            className="rounded-lg bg-mahara-gold px-8 py-3 font-semibold text-white transition hover:opacity-90"
          >
            {t("cta_talent")}
          </Link>
          <Link
            href="/auth/signup?role=business"
            className="rounded-lg border-2 border-white px-8 py-3 font-semibold text-white transition hover:bg-white hover:text-mahara-green"
          >
            {t("cta_business")}
          </Link>
        </div>
      </div>
    </main>
  );
}
