"use client";

import { upsertTalentProfile } from "@/app/actions/talent-profile";
import type { SkillEntry } from "@mahara/core";
import type { TalentProfile } from "@mahara/db";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

type AvailabilityStatus = "available" | "in_project" | "unavailable";
type SkillLevel = "junior" | "intermediate" | "advanced" | "expert";

type FormSkill = SkillEntry & { _key: string };
type FormUrl = { _key: string; url: string };

type FormState = {
  bio: string;
  skills: FormSkill[];
  portfolioUrls: FormUrl[];
  languages: string[];
  hourlyRateMad: string;
  availability: AvailabilityStatus;
};

function genKey() {
  return Math.random().toString(36).slice(2);
}

function profileToFormState(profile: TalentProfile | null | undefined): FormState {
  return {
    bio: profile?.bio ?? "",
    skills: ((profile?.skills as SkillEntry[]) ?? []).map((s, i) => ({
      ...s,
      _key: `init-skill-${i}`,
    })),
    portfolioUrls: (profile?.portfolioUrls ?? []).map((url, i) => ({
      _key: `init-url-${i}`,
      url,
    })),
    languages: profile?.languages ?? ["fr"],
    hourlyRateMad: profile?.hourlyRate ? String(profile.hourlyRate / 100) : "",
    availability: (profile?.availability as AvailabilityStatus) ?? "available",
  };
}

const SKILL_LEVELS: SkillLevel[] = ["junior", "intermediate", "advanced", "expert"];
const LANGUAGES = ["fr", "ar", "en", "darija"];

type Props = { initialProfile?: TalentProfile | null };

export function TalentProfileForm({ initialProfile }: Props) {
  const t = useTranslations("profile.talent");
  const tLevels = useTranslations("profile.skill_levels");
  const tAvail = useTranslations("profile.availability");

  const [form, setForm] = useState<FormState>(() => profileToFormState(initialProfile));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const hourlyRate =
      form.hourlyRateMad.trim() !== "" ? Math.round(Number(form.hourlyRateMad) * 100) : undefined;

    startTransition(async () => {
      try {
        await upsertTalentProfile({
          bio: form.bio || undefined,
          skills: form.skills.map(({ _key: _k, ...s }) => s),
          portfolioUrls: form.portfolioUrls.map((e) => e.url).filter(Boolean),
          languages: form.languages,
          hourlyRate,
          availability: form.availability,
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
      }
    });
  }

  // Skills
  function addSkill() {
    setForm((f) => ({
      ...f,
      skills: [...f.skills, { _key: genKey(), skill: "", level: "junior", verified: false }],
    }));
  }
  function updateSkill(i: number, patch: Partial<SkillEntry>) {
    setForm((f) => ({
      ...f,
      skills: f.skills.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  }
  function removeSkill(i: number) {
    setForm((f) => ({ ...f, skills: f.skills.filter((_, idx) => idx !== i) }));
  }

  // Portfolio URLs
  function addUrl() {
    setForm((f) => ({
      ...f,
      portfolioUrls: [...f.portfolioUrls, { _key: genKey(), url: "" }],
    }));
  }
  function updateUrl(i: number, val: string) {
    setForm((f) => ({
      ...f,
      portfolioUrls: f.portfolioUrls.map((e, idx) => (idx === i ? { ...e, url: val } : e)),
    }));
  }
  function removeUrl(i: number) {
    setForm((f) => ({ ...f, portfolioUrls: f.portfolioUrls.filter((_, idx) => idx !== i) }));
  }

  // Languages
  function toggleLanguage(lang: string) {
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(lang)
        ? f.languages.filter((l) => l !== lang)
        : [...f.languages, lang],
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Bio */}
      <div>
        <label htmlFor="talent-bio" className="block text-sm font-medium text-gray-700 mb-1">
          {t("bio")}
        </label>
        <textarea
          id="talent-bio"
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          placeholder={t("bio_placeholder")}
          rows={4}
          maxLength={2000}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40 resize-none"
        />
      </div>

      {/* Skills */}
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">{t("skills")}</p>
        <div className="space-y-2">
          {form.skills.map((skill, i) => (
            <div key={skill._key} className="flex gap-2 items-center">
              <input
                value={skill.skill}
                onChange={(e) => updateSkill(i, { skill: e.target.value })}
                placeholder={t("skill_name")}
                maxLength={100}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
              />
              <select
                value={skill.level}
                onChange={(e) => updateSkill(i, { level: e.target.value as SkillLevel })}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
              >
                {SKILL_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {tLevels(lvl)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeSkill(i)}
                className="text-gray-400 hover:text-red-500 text-lg leading-none"
                aria-label="Supprimer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {form.skills.length < 20 && (
          <button
            type="button"
            onClick={addSkill}
            className="mt-2 text-sm text-mahara-green hover:underline"
          >
            + {t("add_skill")}
          </button>
        )}
      </div>

      {/* Portfolio URLs */}
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">{t("portfolio_urls")}</p>
        <div className="space-y-2">
          {form.portfolioUrls.map((entry, i) => (
            <div key={entry._key} className="flex gap-2 items-center">
              <input
                value={entry.url}
                onChange={(e) => updateUrl(i, e.target.value)}
                placeholder={t("portfolio_placeholder")}
                type="url"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
              />
              <button
                type="button"
                onClick={() => removeUrl(i)}
                className="text-gray-400 hover:text-red-500 text-lg leading-none"
                aria-label="Supprimer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {form.portfolioUrls.length < 10 && (
          <button
            type="button"
            onClick={addUrl}
            className="mt-2 text-sm text-mahara-green hover:underline"
          >
            + {t("add_portfolio")}
          </button>
        )}
      </div>

      {/* Languages */}
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">{t("languages")}</p>
        <div className="flex gap-2 flex-wrap">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => toggleLanguage(lang)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                form.languages.includes(lang)
                  ? "bg-mahara-green text-white border-mahara-green"
                  : "border-gray-300 text-gray-600 hover:border-mahara-green"
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Hourly rate */}
      <div>
        <label htmlFor="hourly-rate" className="block text-sm font-medium text-gray-700 mb-1">
          {t("hourly_rate")}
        </label>
        <div className="flex items-center gap-2">
          <input
            id="hourly-rate"
            value={form.hourlyRateMad}
            onChange={(e) => setForm((f) => ({ ...f, hourlyRateMad: e.target.value }))}
            type="number"
            min={0}
            max={100000}
            placeholder="0"
            className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
          />
          <span className="text-sm text-gray-500">MAD</span>
        </div>
      </div>

      {/* Availability */}
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">{t("availability")}</p>
        <div className="flex gap-3 flex-wrap">
          {(["available", "in_project", "unavailable"] as const).map((status) => (
            <label
              key={status}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                form.availability === status
                  ? "border-mahara-green bg-mahara-green/5 text-mahara-green"
                  : "border-gray-200 text-gray-600 hover:border-mahara-green/50"
              }`}
            >
              <input
                type="radio"
                name="availability"
                value={status}
                checked={form.availability === status}
                onChange={() => setForm((f) => ({ ...f, availability: status }))}
                className="sr-only"
              />
              <span
                className={`h-2 w-2 rounded-full ${
                  status === "available"
                    ? "bg-green-500"
                    : status === "in_project"
                      ? "bg-amber-500"
                      : "bg-gray-400"
                }`}
              />
              <span className="text-sm font-medium">{tAvail(status)}</span>
            </label>
          ))}
        </div>
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
