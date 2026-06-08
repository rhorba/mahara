import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { LogoutButton } from "./logout-button";

export async function NavBar() {
  const [t, session] = await Promise.all([getTranslations("nav"), auth()]);
  const role = session?.user?.role;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-xl font-bold text-mahara-green"
        >
          <span>مهارة</span>
          <span className="text-mahara-gold">·</span>
          <span>Mahara</span>
        </Link>

        {/* Public nav links */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link
            href="/gigs"
            className="text-sm font-medium text-gray-600 transition hover:text-mahara-green"
          >
            {t("gigs")}
          </Link>

          {!role && (
            <Link
              href="/talent"
              className="text-sm font-medium text-gray-600 transition hover:text-mahara-green"
            >
              {t("talents")}
            </Link>
          )}

          {/* Role-specific links */}
          {role === "talent" && (
            <Link
              href="/talent/dashboard"
              className="text-sm font-medium text-gray-600 transition hover:text-mahara-green"
            >
              {t("dashboard")}
            </Link>
          )}

          {role === "business" && (
            <Link
              href="/business/dashboard"
              className="text-sm font-medium text-gray-600 transition hover:text-mahara-green"
            >
              {t("dashboard")}
            </Link>
          )}

          {role === "admin" && (
            <Link
              href="/admin/dashboard"
              className="text-sm font-medium text-gray-600 transition hover:text-mahara-green"
            >
              {t("dashboard")}
            </Link>
          )}
        </div>

        {/* Auth controls */}
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-gray-500 sm:block">
                {session.user.name ?? session.user.email}
              </span>
              <LogoutButton />
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-gray-600 transition hover:text-mahara-green"
              >
                {t("login")}
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-mahara-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-mahara-green-light"
              >
                {t("signup")}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
