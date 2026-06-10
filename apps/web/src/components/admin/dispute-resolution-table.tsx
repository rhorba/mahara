"use client";

import { resolveDispute } from "@/app/actions/payments";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type DisputedEscrow = {
  id: string;
  grossAmount: number;
  createdAt: Date;
  gig: { id: string; title: string } | null;
  business: { name: string | null; email: string } | null;
  talent: { name: string | null; email: string } | null;
};

type Props = { escrows: DisputedEscrow[] };

export function DisputeResolutionTable({ escrows }: Props) {
  const t = useTranslations("admin.disputes");
  const router = useRouter();

  if (escrows.length === 0) {
    return <p className="text-sm text-gray-500">{t("empty")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-red-100">
      <table className="w-full text-sm">
        <thead className="border-b border-red-100 bg-red-50">
          <tr>
            {[
              t("gig"),
              t("business"),
              t("talent"),
              t("amount"),
              t("opened_at"),
              t("actions") ?? "Actions",
            ].map((h) => (
              <th key={h} className="px-4 py-3 text-start font-semibold text-red-700">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-red-50">
          {escrows.map((e) => (
            <DisputeRow key={e.id} escrow={e} onDone={() => router.refresh()} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DisputeRow({
  escrow: e,
  onDone,
}: {
  escrow: DisputedEscrow;
  onDone: () => void;
}) {
  const t = useTranslations("admin.disputes");
  const [isPending, startTransition] = useTransition();

  function resolve(resolution: "release" | "refund") {
    startTransition(async () => {
      await resolveDispute({ escrowId: e.id, resolution });
      onDone();
    });
  }

  const amountStr = new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 0,
  }).format(e.grossAmount / 100);

  return (
    <tr className="bg-white transition hover:bg-red-50/40">
      <td className="max-w-[160px] truncate px-4 py-3 font-medium text-gray-800">
        {e.gig?.title ?? "—"}
      </td>
      <td className="px-4 py-3 text-gray-600">{e.business?.name ?? e.business?.email ?? "—"}</td>
      <td className="px-4 py-3 text-gray-600">{e.talent?.name ?? e.talent?.email ?? "—"}</td>
      <td className="px-4 py-3 font-mono font-semibold text-gray-800">{amountStr}</td>
      <td className="px-4 py-3 text-gray-400">
        {new Date(e.createdAt).toLocaleDateString("fr-MA")}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => resolve("release")}
            disabled={isPending}
            className="rounded bg-mahara-green px-3 py-1 text-xs font-semibold text-white transition hover:bg-mahara-green-light disabled:opacity-50"
            aria-label={`${t("resolve_release")} — ${e.gig?.title}`}
          >
            {isPending ? t("releasing") : t("resolve_release")}
          </button>
          <button
            type="button"
            onClick={() => resolve("refund")}
            disabled={isPending}
            className="rounded border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            aria-label={`${t("resolve_refund")} — ${e.gig?.title}`}
          >
            {isPending ? t("refunding") : t("resolve_refund")}
          </button>
        </div>
      </td>
    </tr>
  );
}
