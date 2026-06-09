"use client";

import { createReview } from "@/app/actions/review";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  gigId: string;
  gigTitle: string;
  onSuccess?: () => void;
};

const STAR_LABELS = ["", "stars.1", "stars.2", "stars.3", "stars.4", "stars.5"] as const;

export function ReviewForm({ gigId, gigTitle, onSuccess }: Props) {
  const t = useTranslations("reviews");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Veuillez sélectionner une note.");
      return;
    }
    setError("");

    startTransition(async () => {
      try {
        await createReview({ gigId, rating, comment: comment.trim() || undefined });
        setSubmitted(true);
        router.refresh();
        onSuccess?.();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur inattendue.";
        setError(msg);
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-mahara-green/30 bg-mahara-green/5 p-4 text-sm text-mahara-green font-medium">
        {t("submitted")} ✓
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">{t("review_prompt")}</p>

      {/* Star rating */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5">{t("rating")}</p>
        <div className="flex gap-1" aria-label={t("rating")}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              aria-label={t(STAR_LABELS[star])}
              className={`text-2xl transition-colors ${
                star <= (hover || rating) ? "text-mahara-gold" : "text-gray-200"
              }`}
            >
              ★
            </button>
          ))}
        </div>
        {(hover || rating) > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            {t(STAR_LABELS[hover || rating])}
          </p>
        )}
      </div>

      {/* Comment */}
      <div>
        <label htmlFor={`review-comment-${gigId}`} className="text-xs text-gray-500 mb-1 block">
          {t("comment")}
        </label>
        <textarea
          id={`review-comment-${gigId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("comment_placeholder")}
          rows={3}
          maxLength={1000}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/30 resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">{t("review_timeout_note")}</p>
        <button
          type="submit"
          disabled={isPending || rating === 0}
          className="px-4 py-2 bg-mahara-green text-white rounded-lg text-sm font-medium hover:bg-mahara-green/90 disabled:opacity-60 transition-colors shrink-0"
        >
          {isPending ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
