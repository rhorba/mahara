"use client";

import { upsertBusinessProfile } from "@/app/actions/business-profile";
import type { BusinessProfile } from "@mahara/db";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

type BusinessSize = "1" | "2-10" | "11-50" | "50+";

type FormState = {
  companyName: string;
  sector: string;
  size: BusinessSize | "";
  ice: string;
  website: string;
};

function profileToFormState(profile: BusinessProfile | null | undefined): FormState {
  return {
    companyName: profile?.companyName ?? "",
    sector: profile?.sector ?? "",
    size: (profile?.size as BusinessSize) ?? "",
    ice: profile?.ice ?? "",
    website: profile?.website ?? "",
  };
}

const BUSINESS_SIZES: BusinessSize[] = ["1", "2-10", "11-50", "50+"];

type Props = { initialProfile?: BusinessProfile | null };

export function BusinessProfileForm({ initialProfile }: Props) {
  const t = useTranslations("profile.business");
  const tSize = useTranslations("profile.business_size");

  const [form, setForm] = useState<FormState>(() => profileToFormState(initialProfile));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      try {
        await upsertBusinessProfile({
          companyName: form.companyName,
          sector: form.sector || undefined,
          size: form.size || undefined,
          ice: form.ice || undefined,
          website: form.website || undefined,
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Company name */}
      <div>
        <label htmlFor="biz-company-name" className="block text-sm font-medium text-gray-700 mb-1">
          {t("company_name")} <span className="text-red-500">*</span>
        </label>
        <input
          id="biz-company-name"
          value={form.companyName}
          onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
          required
          minLength={2}
          maxLength={200}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
        />
      </div>

      {/* Sector */}
      <div>
        <label htmlFor="biz-sector" className="block text-sm font-medium text-gray-700 mb-1">
          {t("sector")}
        </label>
        <input
          id="biz-sector"
          value={form.sector}
          onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
          maxLength={100}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
        />
      </div>

      {/* Size — button group, no single input */}
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">{t("size")}</p>
        <div className="flex gap-2 flex-wrap">
          {BUSINESS_SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => setForm((f) => ({ ...f, size: sz }))}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                form.size === sz
                  ? "border-mahara-green bg-mahara-green text-white"
                  : "border-gray-200 text-gray-600 hover:border-mahara-green/50"
              }`}
            >
              {tSize(sz)}
            </button>
          ))}
        </div>
      </div>

      {/* ICE */}
      <div>
        <label htmlFor="biz-ice" className="block text-sm font-medium text-gray-700 mb-1">
          {t("ice")}
        </label>
        <input
          id="biz-ice"
          value={form.ice}
          onChange={(e) => setForm((f) => ({ ...f, ice: e.target.value }))}
          pattern="[0-9]{9}"
          maxLength={9}
          placeholder="000000000"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40 font-mono"
        />
      </div>

      {/* Website */}
      <div>
        <label htmlFor="biz-website" className="block text-sm font-medium text-gray-700 mb-1">
          {t("website")}
        </label>
        <input
          id="biz-website"
          value={form.website}
          onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
          type="url"
          placeholder="https://..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
        />
      </div>

      {/* Feedback */}
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {saved && (
        <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{t("saved")}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-2.5 bg-mahara-green text-white rounded-lg text-sm font-semibold hover:bg-mahara-green/90 disabled:opacity-60 transition-colors"
      >
        {isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
