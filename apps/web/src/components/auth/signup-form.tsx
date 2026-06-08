"use client";

import { googleSignInAction, signupAction } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

type Props = {
  defaultRole?: "talent" | "business";
};

export function SignupForm({ defaultRole = "talent" }: Props) {
  const t = useTranslations("auth");
  const [state, formAction, isPending] = useActionState(signupAction, null);

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="mb-6 text-center text-2xl font-bold text-mahara-green">{t("signup_title")}</h1>

      {state?.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3">
          {(["talent", "business"] as const).map((role) => (
            <label
              key={role}
              className="relative flex cursor-pointer flex-col items-center rounded-xl border-2 p-3 transition has-[:checked]:border-mahara-green has-[:checked]:bg-mahara-green-pale border-gray-200"
            >
              <input
                type="radio"
                name="role"
                value={role}
                defaultChecked={defaultRole === role}
                className="sr-only"
                required
              />
              <span className="text-sm font-medium text-gray-700">
                {role === "talent" ? t("role_talent") : t("role_business")}
              </span>
            </label>
          ))}
        </div>

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
            {t("name")}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-mahara-green focus:outline-none focus:ring-1 focus:ring-mahara-green"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-mahara-green focus:outline-none focus:ring-1 focus:ring-mahara-green"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            {t("password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-mahara-green focus:outline-none focus:ring-1 focus:ring-mahara-green"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-mahara-green px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-mahara-green-light disabled:opacity-60"
        >
          {isPending ? "..." : t("submit_signup")}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-gray-400">{t("or")}</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      <form action={googleSignInAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
            />
          </svg>
          {t("google")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t("already_member")}{" "}
        <Link href="/auth/login" className="font-medium text-mahara-green hover:underline">
          {t("login_title")}
        </Link>
      </p>
    </div>
  );
}
