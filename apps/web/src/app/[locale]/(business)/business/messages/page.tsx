import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { db, messageThreads, messages } from "@mahara/db";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function BusinessMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "business") redirect("/");

  const t = await getTranslations("messaging");

  const threads = await db.query.messageThreads.findMany({
    where: eq(messageThreads.businessId, session.user.id),
    with: {
      gig: true,
      talent: true,
      messages: {
        orderBy: [desc(messages.createdAt)],
        limit: 1,
      },
    },
    orderBy: [desc(messageThreads.lastMessageAt)],
  });

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-display font-bold text-mahara-green mb-6">{t("title")}</h1>

      {threads.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">
          {t("no_threads")}
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => {
            const lastMsg = thread.messages[0];
            return (
              <Link
                key={thread.id}
                href={`/business/messages/${thread.id}`}
                className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-mahara-green/30 hover:bg-mahara-green/5 transition-all"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-mahara-green/10 flex items-center justify-center text-mahara-green font-bold text-sm">
                  {thread.talent?.name?.[0]?.toUpperCase() ?? "T"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {thread.talent?.name ?? "Talent"}
                    </p>
                    {lastMsg && (
                      <p className="text-xs text-gray-400 shrink-0">
                        {new Intl.DateTimeFormat("fr", {
                          day: "numeric",
                          month: "short",
                        }).format(new Date(lastMsg.createdAt))}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {thread.gig?.title ?? "Mission"}
                  </p>
                  {lastMsg && (
                    <p className="text-xs text-gray-400 truncate mt-1 line-clamp-1">
                      {lastMsg.body}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
