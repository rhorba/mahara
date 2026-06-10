"use client";

import {
  approveSkillVerification,
  rejectSkillVerification,
} from "@/app/actions/skill-verification";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Verification = {
  id: string;
  skill: string;
  method: string;
  status: string;
  createdAt: Date;
  talentProfile: {
    id: string;
    user: { name: string | null; email: string } | null;
  } | null;
};

type Props = { verifications: Verification[] };

export function VerificationQueueTable({ verifications }: Props) {
  const t = useTranslations("admin.verifications");
  const router = useRouter();

  if (verifications.length === 0) {
    return <p className="text-sm text-gray-500">{t("empty")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            {[t("talent"), t("skill"), t("method"), t("requested_at"), t("actions")].map((h) => (
              <th key={h} className="px-4 py-3 text-start font-semibold text-gray-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {verifications.map((v) => (
            <VerificationRow key={v.id} v={v} onDone={() => router.refresh()} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerificationRow({
  v,
  onDone,
}: {
  v: Verification;
  onDone: () => void;
}) {
  const t = useTranslations("admin.verifications");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const talentName = v.talentProfile?.user?.name ?? v.talentProfile?.user?.email ?? "—";

  function handle(action: "approve" | "reject") {
    startTransition(async () => {
      const fn = action === "approve" ? approveSkillVerification : rejectSkillVerification;
      await fn({ verificationId: v.id, adminNote: note || undefined });
      onDone();
    });
  }

  return (
    <tr className="bg-white transition hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-800">{talentName}</td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-mahara-green-pale px-2 py-0.5 text-xs font-medium text-mahara-green">
          {v.skill}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500">{v.method}</td>
      <td className="px-4 py-3 text-gray-400">
        {new Date(v.createdAt).toLocaleDateString("fr-MA")}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <input
            className="rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-mahara-gold"
            placeholder={t("note_placeholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isPending}
            aria-label={`Admin note for ${v.skill}`}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handle("approve")}
              disabled={isPending}
              className="rounded bg-mahara-green px-3 py-1 text-xs font-semibold text-white transition hover:bg-mahara-green-light disabled:opacity-50"
              aria-label={`${t("approve")} ${v.skill}`}
            >
              {isPending ? t("approving") : t("approve")}
            </button>
            <button
              type="button"
              onClick={() => handle("reject")}
              disabled={isPending}
              className="rounded border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              aria-label={`${t("reject")} ${v.skill}`}
            >
              {isPending ? t("rejecting") : t("reject")}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
