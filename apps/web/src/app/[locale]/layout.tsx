import { NavBar } from "@/components/nav/navbar";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Mahara — مهارة",
  description: "Les talents marocains. À portée de clic.",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "fr" | "ar" | "en")) {
    notFound();
  }

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen bg-white font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-mahara-green focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          {locale === "ar" ? "انتقل إلى المحتوى الرئيسي" : "Aller au contenu principal"}
        </a>
        <NavBar />
        <NextIntlClientProvider messages={messages}>
          <div id="main">{children}</div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
