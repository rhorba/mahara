"use client";

import { sendMessage } from "@/app/actions/message";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useRef, useTransition } from "react";

interface Props {
  threadId: string;
}

export function MessageComposer({ threadId }: Props) {
  const t = useTranslations("messaging");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = textareaRef.current?.value.trim();
    if (!body) return;

    startTransition(async () => {
      try {
        await sendMessage({ threadId, body });
        if (textareaRef.current) textareaRef.current.value = "";
        router.refresh();
      } catch {
        // error state handled by server action throw
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-100 bg-white p-4">
      <div className="flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          rows={2}
          maxLength={4000}
          placeholder={t("send_placeholder")}
          onKeyDown={handleKeyDown}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mahara-green/30 focus:border-mahara-green transition"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-mahara-green text-white rounded-xl text-sm font-semibold hover:bg-mahara-green/90 transition-colors disabled:opacity-50 shrink-0"
        >
          {isPending ? t("sending") : t("send_btn")}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1.5">Ctrl+Entrée pour envoyer</p>
    </form>
  );
}
