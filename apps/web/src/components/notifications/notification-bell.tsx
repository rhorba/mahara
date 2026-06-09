"use client";

import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notification";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type NotificationType =
  | "gig_match"
  | "proposal_accepted"
  | "proposal_rejected"
  | "new_message"
  | "payment_released"
  | "review_requested"
  | "verification_approved"
  | "gig_completed";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: Date | null;
  createdAt: Date;
};

type Props = {
  initialNotifications: Notification[];
};

export function NotificationBell({ initialNotifications }: Props) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.readAt);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead({ notificationId: id });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)));
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
    });
  }

  const TYPE_ICON: Record<NotificationType, string> = {
    gig_match: "🎯",
    proposal_accepted: "✅",
    proposal_rejected: "❌",
    new_message: "💬",
    payment_released: "💰",
    review_requested: "⭐",
    verification_approved: "🏆",
    gig_completed: "🎉",
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={t("title")}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5 text-gray-600"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -end-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute end-0 top-full mt-2 w-80 rounded-2xl border border-gray-100 bg-white shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <span className="text-sm font-semibold text-gray-900">{t("title")}</span>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={isPending}
                className="text-xs text-mahara-green hover:underline disabled:opacity-60"
              >
                {t("mark_all_read")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">{t("empty")}</p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.readAt) handleMarkRead(n.id);
                    if (n.linkUrl) router.push(n.linkUrl);
                    setIsOpen(false);
                  }}
                  className={`w-full text-start px-4 py-3 hover:bg-gray-50 transition-colors ${
                    n.readAt ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">{TYPE_ICON[n.type]}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 line-clamp-1">{n.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>
                    </div>
                    {!n.readAt && (
                      <span className="h-1.5 w-1.5 rounded-full bg-mahara-green shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
