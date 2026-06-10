import { getDisputeQueue } from "@/app/actions/admin";
import { DisputeResolutionTable } from "@/components/admin/dispute-resolution-table";
import { getTranslations } from "next-intl/server";

export default async function AdminDisputesPage() {
  const [t, disputes] = await Promise.all([
    getTranslations("admin.disputes"),
    getDisputeQueue({}).catch(() => [] as never[]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-mahara-green">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>
      <DisputeResolutionTable
        escrows={
          // biome-ignore lint/suspicious/noExplicitAny: server action return cast
          disputes as any
        }
      />
    </div>
  );
}
