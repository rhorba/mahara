import { getPendingVerifications } from "@/app/actions/skill-verification";
import { VerificationQueueTable } from "@/components/admin/verification-queue-table";
import { getTranslations } from "next-intl/server";

export default async function AdminVerificationsPage() {
  const [t, verifications] = await Promise.all([
    getTranslations("admin.verifications"),
    getPendingVerifications({}).catch(() => [] as never[]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-mahara-green">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>
      <VerificationQueueTable
        verifications={
          // biome-ignore lint/suspicious/noExplicitAny: server action return cast
          verifications as any
        }
      />
    </div>
  );
}
