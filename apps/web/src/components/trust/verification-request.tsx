"use client";

import { requestSkillVerification } from "@/app/actions/skill-verification";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type SkillEntry = { skill: string; level: string; verified: boolean };

type VerificationRequest = {
  id: string;
  skill: string;
  method: string;
  status: string;
  adminNote: string | null;
  createdAt: Date;
};

type Props = {
  skills: SkillEntry[];
  existingRequests: VerificationRequest[];
};

export function VerificationRequestPanel({ skills, existingRequests }: Props) {
  const t = useTranslations("trust");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<"portfolio" | "test" | "admin_review">(
    "portfolio",
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const STATUS_PILL: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    approved: "bg-mahara-green/10 text-mahara-green",
    rejected: "bg-red-50 text-red-500",
  };

  const unverifiedSkills = skills.filter(
    (s) =>
      !s.verified &&
      !existingRequests.some(
        (r) => r.skill.toLowerCase() === s.skill.toLowerCase() && r.status !== "rejected",
      ),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSkill) return;
    setError("");

    startTransition(async () => {
      try {
        await requestSkillVerification({ skill: selectedSkill, method: selectedMethod });
        setSuccess(true);
        setSelectedSkill("");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur inattendue.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">{t("verification_title")}</h3>

        {/* Existing requests */}
        {existingRequests.length > 0 && (
          <div className="space-y-2 mb-4">
            {existingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <div>
                  <span className="text-sm font-medium text-gray-800">{req.skill}</span>
                  <span className="text-xs text-gray-400 ms-2">{t(`method.${req.method}`)}</span>
                  {req.adminNote && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t("admin_note")}: {req.adminNote}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[req.status] ?? ""}`}>
                  {t(`status.${req.status}`)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Request form */}
        {unverifiedSkills.length > 0 ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="verif-skill" className="text-xs text-gray-500 block mb-1">
                  {t("select_skill")}
                </label>
                <select
                  id="verif-skill"
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/30"
                >
                  <option value="">—</option>
                  {unverifiedSkills.map((s) => (
                    <option key={s.skill} value={s.skill}>
                      {s.skill}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="verif-method" className="text-xs text-gray-500 block mb-1">
                  {t("select_method")}
                </label>
                <select
                  id="verif-method"
                  value={selectedMethod}
                  onChange={(e) =>
                    setSelectedMethod(e.target.value as "portfolio" | "test" | "admin_review")
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mahara-green/30"
                >
                  <option value="portfolio">{t("method.portfolio")}</option>
                  <option value="test">{t("method.test")}</option>
                  <option value="admin_review">{t("method.admin_review")}</option>
                </select>
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            {success && (
              <p className="text-xs text-mahara-green font-medium">{t("requested")} ✓</p>
            )}

            <button
              type="submit"
              disabled={isPending || !selectedSkill}
              className="px-4 py-2 bg-mahara-green text-white rounded-lg text-sm font-medium hover:bg-mahara-green/90 disabled:opacity-60 transition-colors"
            >
              {isPending ? t("requesting") : t("request_verification")}
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-400">{t("no_verifications")}</p>
        )}
      </div>
    </div>
  );
}
