"use client";

import { createGig, publishGig } from "@/app/actions/gig";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

type GigCategory =
  | "design"
  | "development"
  | "marketing"
  | "data"
  | "content"
  | "translation"
  | "admin"
  | "other";

const CATEGORIES: GigCategory[] = [
  "design",
  "development",
  "marketing",
  "data",
  "content",
  "translation",
  "admin",
  "other",
];

type FormState = {
  title: string;
  description: string;
  category: GigCategory;
  skillInput: string;
  skills: string[];
  budgetMad: string;
  duration: string;
  deadline: string;
  urgent: boolean;
};

export function GigPostForm() {
  const t = useTranslations("gigs.post");
  const tCat = useTranslations("gigs.categories");
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    category: "design",
    skillInput: "",
    skills: [],
    budgetMad: "",
    duration: "",
    deadline: "",
    urgent: false,
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function addSkill() {
    const s = form.skillInput.trim();
    if (s && !form.skills.includes(s) && form.skills.length < 10) {
      setForm((f) => ({ ...f, skills: [...f.skills, s], skillInput: "" }));
    }
  }

  function removeSkill(skill: string) {
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));
  }

  function handleSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  }

  function handleSubmit(e: React.FormEvent, publish: boolean) {
    e.preventDefault();
    setError(null);

    const budget = Math.round(Number(form.budgetMad) * 100);
    if (!form.budgetMad || budget < 5000) {
      setError("Budget minimum : 50 MAD");
      return;
    }
    if (form.skills.length === 0) {
      setError("Ajoutez au moins une compétence requise");
      return;
    }

    startTransition(async () => {
      try {
        const gig = await createGig({
          title: form.title,
          description: form.description,
          category: form.category,
          skills: form.skills,
          budget,
          duration: form.duration.trim() || undefined,
          deadline: form.deadline ? new Date(form.deadline) : undefined,
          urgent: form.urgent,
        });

        if (publish && gig) {
          await publishGig({ gigId: gig.id });
        }

        router.push("/business/gigs");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la création");
      }
    });
  }

  return (
    <form className="space-y-6 max-w-2xl">
      {/* Title */}
      <div>
        <label htmlFor="gig-title" className="block text-sm font-medium text-gray-700 mb-1">
          {t("field_title")} <span className="text-red-500">*</span>
        </label>
        <input
          id="gig-title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder={t("field_title_placeholder")}
          maxLength={200}
          required
          minLength={10}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="gig-category" className="block text-sm font-medium text-gray-700 mb-1">
          {t("field_category")} <span className="text-red-500">*</span>
        </label>
        <select
          id="gig-category"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as GigCategory }))}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {tCat(c)}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="gig-desc" className="block text-sm font-medium text-gray-700 mb-1">
          {t("field_description")} <span className="text-red-500">*</span>
        </label>
        <textarea
          id="gig-desc"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder={t("field_description_placeholder")}
          rows={5}
          maxLength={5000}
          required
          minLength={50}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40 resize-none"
        />
      </div>

      {/* Skills */}
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">
          {t("field_skills")} <span className="text-red-500">*</span>
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.skills.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1 px-2.5 py-1 bg-mahara-green/10 text-mahara-green text-sm rounded-full"
            >
              {s}
              <button
                type="button"
                onClick={() => removeSkill(s)}
                className="text-mahara-green/60 hover:text-red-500 ms-1 text-base leading-none"
                aria-label={`Supprimer ${s}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {form.skills.length < 10 && (
          <div className="flex gap-2">
            <input
              value={form.skillInput}
              onChange={(e) => setForm((f) => ({ ...f, skillInput: e.target.value }))}
              onKeyDown={handleSkillKeyDown}
              placeholder={t("field_skill_placeholder")}
              maxLength={100}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
            />
            <button
              type="button"
              onClick={addSkill}
              className="px-4 py-2 bg-mahara-green/10 text-mahara-green text-sm font-medium rounded-lg hover:bg-mahara-green/20 transition-colors"
            >
              {t("add_skill")}
            </button>
          </div>
        )}
      </div>

      {/* Budget */}
      <div>
        <label htmlFor="gig-budget" className="block text-sm font-medium text-gray-700 mb-1">
          {t("field_budget")} <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            id="gig-budget"
            type="number"
            min={50}
            max={500000}
            value={form.budgetMad}
            onChange={(e) => setForm((f) => ({ ...f, budgetMad: e.target.value }))}
            placeholder="2000"
            required
            className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
          />
          <span className="text-sm text-gray-500">MAD</span>
        </div>
        <p className="mt-1 text-xs text-gray-400">{t("budget_hint")}</p>
      </div>

      {/* Duration + Deadline (two-column) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="gig-duration" className="block text-sm font-medium text-gray-700 mb-1">
            {t("field_duration")}
          </label>
          <input
            id="gig-duration"
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
            placeholder={t("field_duration_placeholder")}
            maxLength={100}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
          />
        </div>
        <div>
          <label htmlFor="gig-deadline" className="block text-sm font-medium text-gray-700 mb-1">
            {t("field_deadline")}
          </label>
          <input
            id="gig-deadline"
            type="date"
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
          />
        </div>
      </div>

      {/* Urgent */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={form.urgent}
          onChange={(e) => setForm((f) => ({ ...f, urgent: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-mahara-gold accent-mahara-gold"
        />
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
          {t("field_urgent")}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-mahara-gold/10 text-mahara-gold font-medium">
          Urgent
        </span>
      </label>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={(e) => handleSubmit(e, false)}
          disabled={isPending}
          className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60 transition-colors"
        >
          {t("save_draft")}
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={isPending}
          className="px-6 py-2.5 bg-mahara-green text-white rounded-lg text-sm font-semibold hover:bg-mahara-green/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? t("publishing") : t("publish")}
        </button>
      </div>
    </form>
  );
}
