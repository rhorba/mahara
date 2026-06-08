import { useTranslations } from "next-intl";

export default function GigsPage() {
  const t = useTranslations("gigs");

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-mahara-green">{t("title")}</h1>
      <p className="text-gray-600">{t("browse_description")}</p>
    </main>
  );
}
