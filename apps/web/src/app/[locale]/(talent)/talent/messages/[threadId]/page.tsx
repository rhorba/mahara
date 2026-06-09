import { MessageComposer } from "@/components/messaging/message-composer";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { db, messageThreads, messages } from "@mahara/db";
import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string; threadId: string }> };

export default async function TalentThreadPage({ params }: Props) {
  const { threadId } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (session.user.role !== "talent") redirect("/");

  const t = await getTranslations("messaging");
  const tGigs = await getTranslations("gigs");

  const thread = await db.query.messageThreads.findFirst({
    where: eq(messageThreads.id, threadId),
    with: { gig: true, business: true },
  });
  if (!thread) notFound();
  if (thread.talentId !== session.user.id) redirect("/talent/messages");

  const msgs = await db.query.messages.findMany({
    where: eq(messages.threadId, threadId),
    with: { sender: true },
    orderBy: [asc(messages.createdAt)],
  });

  return (
    <main className="container mx-auto px-4 py-0 max-w-3xl flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-3 py-4 border-b border-gray-100 bg-white">
        <Link
          href="/talent/messages"
          className="text-sm text-gray-500 hover:text-mahara-green transition-colors"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {thread.business?.name ?? "Entreprise"}
          </p>
          <Link
            href={`/gigs/${thread.gigId}`}
            className="text-xs text-mahara-green hover:underline truncate block"
          >
            {thread.gig?.title ?? tGigs("view_profile")}
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {msgs.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">{t("no_messages")}</p>
        ) : (
          msgs.map((msg) => {
            const isMine = msg.senderId === session.user.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? "bg-mahara-green text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.body}
                  <p
                    className={`text-xs mt-1 ${isMine ? "text-white/60" : "text-gray-400"} text-end`}
                  >
                    {new Intl.DateTimeFormat("fr", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(msg.createdAt))}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <MessageComposer threadId={threadId} />
    </main>
  );
}
