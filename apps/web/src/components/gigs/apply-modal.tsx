"use client";

import { applyToGig } from "@/app/actions/proposal";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

type Props = {
  gigId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function ApplyModal({ gigId, onClose, onSuccess }: Props) {
  const t = useTranslations("gigs.apply");

  const [form, setForm] = useState({
    coverLetter: "",
    proposedBudgetMad: "",
    estimatedDays: "",
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const proposedBudget =
      form.proposedBudgetMad.trim() !== ""
        ? Math.round(Number(form.proposedBudgetMad) * 100)
        : undefined;
    const estimatedDays = form.estimatedDays.trim() !== "" ? Number(form.estimatedDays) : undefined;

    startTransition(async () => {
      try {
        await applyToGig({
          gigId,
          coverLetter: form.coverLetter.trim() || undefined,
          proposedBudget,
          estimatedDays,
        });
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
      }
    });
  }

  return (
    <dialog
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 m-0 max-w-none max-h-none w-full h-full border-0"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      open
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t("title")}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apply-cover" className="block text-sm font-medium text-gray-700 mb-1">
              {t("field_cover_letter")}
            </label>
            <textarea
              id="apply-cover"
              value={form.coverLetter}
              onChange={(e) => setForm((f) => ({ ...f, coverLetter: e.target.value }))}
              placeholder={t("field_cover_letter_placeholder")}
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="apply-budget"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("field_proposed_budget")}
              </label>
              <input
                id="apply-budget"
                type="number"
                min={0}
                max={500000}
                value={form.proposedBudgetMad}
                onChange={(e) => setForm((f) => ({ ...f, proposedBudgetMad: e.target.value }))}
                placeholder="0"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
              />
            </div>
            <div>
              <label htmlFor="apply-days" className="block text-sm font-medium text-gray-700 mb-1">
                {t("field_estimated_days")}
              </label>
              <input
                id="apply-days"
                type="number"
                min={1}
                max={365}
                value={form.estimatedDays}
                onChange={(e) => setForm((f) => ({ ...f, estimatedDays: e.target.value }))}
                placeholder="14"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/40"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{t("notice")}</p>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-mahara-green text-white rounded-lg text-sm font-semibold hover:bg-mahara-green/90 disabled:opacity-60 transition-colors"
            >
              {isPending ? t("submitting") : t("submit")}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
