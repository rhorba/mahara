"use client";

import { acceptProposal, rejectProposal, withdrawProposal } from "@/app/actions/proposal";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

// ── Business side: Accept / Reject ───────────────────────────────────────────

type BusinessActionsProps = {
  proposalId: string;
  status: string;
};

export function BusinessProposalActions({ proposalId, status }: BusinessActionsProps) {
  const t = useTranslations("gigs.proposals");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "pending") return null;

  function handleAccept() {
    setError(null);
    setAction("accept");
    startTransition(async () => {
      try {
        await acceptProposal({ proposalId });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
        setAction(null);
      }
    });
  }

  function handleReject() {
    setError(null);
    setAction("reject");
    startTransition(async () => {
      try {
        await rejectProposal({ proposalId });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
        setAction(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAccept}
          disabled={isPending}
          className="flex-1 px-3 py-1.5 bg-mahara-green text-white text-xs font-semibold rounded-lg hover:bg-mahara-green/90 disabled:opacity-60 transition-colors"
        >
          {isPending && action === "accept" ? t("accepting") : t("accept")}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={isPending}
          className="flex-1 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
        >
          {isPending && action === "reject" ? t("rejecting") : t("reject")}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── Talent side: Withdraw ────────────────────────────────────────────────────

type TalentActionsProps = {
  proposalId: string;
  status: string;
};

export function TalentProposalActions({ proposalId, status }: TalentActionsProps) {
  const t = useTranslations("gigs.proposals");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status !== "pending") return null;

  function handleWithdraw() {
    setError(null);
    startTransition(async () => {
      try {
        await withdrawProposal({ proposalId });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleWithdraw}
        disabled={isPending}
        className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
      >
        {isPending ? t("withdrawing") : t("withdraw")}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
