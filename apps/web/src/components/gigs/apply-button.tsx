"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ApplyModal } from "./apply-modal";

type Props = {
  gigId: string;
  isAuthenticated: boolean;
  isTalent: boolean;
  hasApplied: boolean;
};

export function ApplyButton({ gigId, isAuthenticated, isTalent, hasApplied }: Props) {
  const t = useTranslations("gigs");
  const tApply = useTranslations("gigs.apply");
  const [showModal, setShowModal] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent || hasApplied) {
    return (
      <div className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium text-center">
        {tApply("already_applied")}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Link
        href="/auth/login"
        className="block text-center px-6 py-3 bg-mahara-green text-white rounded-xl text-sm font-semibold hover:bg-mahara-green/90 transition-colors"
      >
        {tApply("login_to_apply")}
      </Link>
    );
  }

  if (!isTalent) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full px-6 py-3 bg-mahara-green text-white rounded-xl text-sm font-semibold hover:bg-mahara-green/90 transition-colors"
      >
        {t("apply_btn")}
      </button>
      {showModal && (
        <ApplyModal
          gigId={gigId}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            setSent(true);
          }}
        />
      )}
    </>
  );
}
