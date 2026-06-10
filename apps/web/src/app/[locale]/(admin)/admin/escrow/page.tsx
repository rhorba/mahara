import { getEscrowHealth } from "@/app/actions/admin";
import { getTranslations } from "next-intl/server";

function fmtMAD(centimes: number): string {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(centimes / 100);
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  funded: "bg-blue-50 text-blue-700 border-blue-200",
  released: "bg-green-50 text-green-700 border-green-200",
  refunded: "bg-gray-50 text-gray-600 border-gray-200",
  disputed: "bg-red-50 text-red-700 border-red-200",
};

export default async function AdminEscrowPage() {
  const [t, escrows] = await Promise.all([
    getTranslations("admin.escrow"),
    getEscrowHealth({}).catch(() => [] as never[]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-mahara-green">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      {escrows.length === 0 ? (
        <p className="text-sm text-gray-500">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {[
                  t("gig"),
                  t("business"),
                  t("talent"),
                  t("gross"),
                  t("status"),
                  t("funded_at"),
                  t("released_at"),
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-start font-semibold text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {escrows.map((e) => (
                <tr key={e.id} className="bg-white transition hover:bg-gray-50">
                  <td className="max-w-[160px] truncate px-4 py-3 font-medium text-gray-800">
                    {e.gig?.title ?? e.gigId}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {e.business?.name ?? e.business?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {e.talent?.name ?? e.talent?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-800">{fmtMAD(e.grossAmount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[e.status] ?? "bg-gray-50 text-gray-500"
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {e.fundedAt ? new Date(e.fundedAt).toLocaleDateString("fr-MA") : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {e.releasedAt ? new Date(e.releasedAt).toLocaleDateString("fr-MA") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
