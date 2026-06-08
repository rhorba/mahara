"use client";

import { signOutAction } from "@/app/actions/auth";
import { useTranslations } from "next-intl";

export function LogoutButton() {
  const t = useTranslations("nav");

  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="text-sm font-medium text-gray-600 transition hover:text-mahara-green"
      >
        {t("logout")}
      </button>
    </form>
  );
}
