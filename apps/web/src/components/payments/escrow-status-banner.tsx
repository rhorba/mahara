"use client";

import {
  initiatePayment,
  markGigComplete,
  openDispute,
  refundEscrow,
  releaseEscrow,
} from "@/app/actions/payments";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type EscrowStatus = "pending" | "funded" | "released" | "refunded" | "disputed";
type GigStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled" | "disputed";

type Props = {
  escrowId: string;
  gigId: string;
  escrowStatus: EscrowStatus;
  gigStatus: GigStatus;
  grossAmount: number;
  platformFeeFromBusiness: number;
  platformFeeFromTalent: number;
  talentPayout: number;
  userRole: "business" | "talent";
  locale: string;
};

function fmt(centimes: number, locale: string) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-MA" : "fr-MA", {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 0,
  }).format(centimes / 100);
}

export function EscrowStatusBanner({
  escrowId,
  gigId,
  escrowStatus,
  gigStatus,
  grossAmount,
  platformFeeFromBusiness,
  platformFeeFromTalent,
  talentPayout,
  userRole,
  locale,
}: Props) {
  const t = useTranslations("payments");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const businessTotal = grossAmount + platformFeeFromBusiness;

  const STATUS_COLORS: Record<EscrowStatus, string> = {
    pending: "border-amber-200 bg-amber-50",
    funded: "border-mahara-green/30 bg-mahara-green/5",
    released: "border-mahara-green/40 bg-mahara-green/10",
    refunded: "border-gray-200 bg-gray-50",
    disputed: "border-orange-200 bg-orange-50",
  };

  const STATUS_DOT: Record<EscrowStatus, string> = {
    pending: "bg-amber-400",
    funded: "bg-mahara-green",
    released: "bg-mahara-green",
    refunded: "bg-gray-400",
    disputed: "bg-orange-400",
  };

  function handlePay() {
    startTransition(async () => {
      const result = await initiatePayment({ escrowId });
      if ("redirectUrl" in result) {
        router.push(result.redirectUrl as string);
      }
    });
  }

  function handleMarkComplete() {
    startTransition(async () => {
      await markGigComplete({ gigId });
      router.refresh();
    });
  }

  function handleRelease() {
    startTransition(async () => {
      await releaseEscrow({ escrowId });
      router.refresh();
    });
  }

  function handleRefund() {
    startTransition(async () => {
      await refundEscrow({ escrowId });
      router.refresh();
    });
  }

  function handleDispute() {
    startTransition(async () => {
      await openDispute({ escrowId });
      router.refresh();
    });
  }

  const statusMsg: Record<string, string> = {
    pending: t("pending_msg"),
    funded_in_progress: t("funded_in_progress_msg"),
    funded_completed: t("funded_completed_msg"),
    released: t("released_msg"),
    refunded: t("refunded_msg"),
    disputed: t("disputed_msg"),
  };

  const messageKey =
    escrowStatus === "funded"
      ? gigStatus === "completed"
        ? "funded_completed"
        : "funded_in_progress"
      : escrowStatus;

  return (
    <div className={`rounded-2xl border p-5 mb-6 ${STATUS_COLORS[escrowStatus]}`}>
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[escrowStatus]}`} />
        <span className="text-sm font-semibold text-gray-700">{t("escrow_banner_title")}</span>
        <span className="ms-auto text-xs text-gray-500 px-2 py-0.5 bg-white/60 rounded-full">
          {t(`status.${escrowStatus}`)}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">{statusMsg[messageKey]}</p>

      {/* Fee breakdown */}
      {(escrowStatus === "pending" || escrowStatus === "funded") && (
        <div className="bg-white/70 rounded-xl p-3 mb-4 text-xs space-y-1.5">
          <p className="font-medium text-gray-700 mb-2">{t("fee_breakdown")}</p>
          <div className="flex justify-between text-gray-500">
            <span>{t("budget")}</span>
            <span>{fmt(grossAmount, locale)}</span>
          </div>
          {userRole === "business" && (
            <div className="flex justify-between text-gray-500">
              <span>{t("platform_fee_business")}</span>
              <span>+{fmt(platformFeeFromBusiness, locale)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-500">
            <span>{t("platform_fee_talent")}</span>
            <span>-{fmt(platformFeeFromTalent, locale)}</span>
          </div>
          <div className="border-t border-gray-100 pt-1.5 mt-1">
            {userRole === "business" ? (
              <div className="flex justify-between font-semibold text-gray-800">
                <span>{t("total_to_pay")}</span>
                <span>{fmt(businessTotal, locale)}</span>
              </div>
            ) : (
              <div className="flex justify-between font-semibold text-mahara-green">
                <span>{t("talent_receives")}</span>
                <span>{fmt(talentPayout, locale)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CTA buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Business CTAs */}
        {userRole === "business" && escrowStatus === "pending" && (
          <button
            type="button"
            onClick={handlePay}
            disabled={isPending}
            className="px-4 py-2 bg-mahara-green text-white rounded-lg text-sm font-medium hover:bg-mahara-green/90 disabled:opacity-60 transition-colors"
          >
            {isPending ? t("paying") : t("pay_now")}
          </button>
        )}

        {userRole === "business" && escrowStatus === "funded" && gigStatus === "in_progress" && (
          <>
            <button
              type="button"
              onClick={handleMarkComplete}
              disabled={isPending}
              className="px-4 py-2 bg-mahara-green text-white rounded-lg text-sm font-medium hover:bg-mahara-green/90 disabled:opacity-60 transition-colors"
            >
              {isPending ? t("marking_complete") : t("mark_complete")}
            </button>
            <button
              type="button"
              onClick={handleRefund}
              disabled={isPending}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              {isPending ? t("refunding") : t("refund")}
            </button>
          </>
        )}

        {userRole === "business" && escrowStatus === "funded" && gigStatus === "completed" && (
          <button
            type="button"
            onClick={handleRelease}
            disabled={isPending}
            className="px-4 py-2 bg-mahara-green text-white rounded-lg text-sm font-medium hover:bg-mahara-green/90 disabled:opacity-60 transition-colors"
          >
            {isPending ? t("releasing") : t("release_payment")}
          </button>
        )}

        {/* Dispute CTA for both parties */}
        {(userRole === "business" || userRole === "talent") && escrowStatus === "funded" && (
          <button
            type="button"
            onClick={handleDispute}
            disabled={isPending}
            className="px-3 py-2 text-xs text-orange-600 hover:underline disabled:opacity-60"
          >
            {isPending ? t("opening_dispute") : t("dispute_cta")}
          </button>
        )}
      </div>
    </div>
  );
}
