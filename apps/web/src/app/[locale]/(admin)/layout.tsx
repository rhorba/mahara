import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

type Props = { children: React.ReactNode };

export default async function AdminLayout({ children }: Props) {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (session.user.role !== "admin") redirect("/");

  const t = await getTranslations("admin.nav");

  const navItems = [
    { href: "/admin/dashboard", label: t("dashboard"), icon: "⬛" },
    { href: "/admin/verifications", label: t("verifications"), icon: "✅" },
    { href: "/admin/escrow", label: t("escrow"), icon: "🔒" },
    { href: "/admin/disputes", label: t("disputes"), icon: "⚠️" },
  ] as const;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 border-e border-gray-100 bg-white md:flex md:flex-col">
        <div className="border-b border-gray-100 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-mahara-green">Admin</p>
        </div>
        <nav className="flex flex-col gap-1 p-3" aria-label="Admin navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-mahara-green-pale hover:text-mahara-green"
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-16 z-30 flex gap-2 overflow-x-auto border-b border-gray-100 bg-white px-4 py-2 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-mahara-green-pale hover:text-mahara-green"
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto px-4 py-6 pt-14 md:px-8 md:pt-6">{children}</main>
    </div>
  );
}
