import type { NotificationType } from "@mahara/core/types";
import { db, notifications } from "@mahara/db";

export type InAppPayload = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
};

/** Insert a single in-app notification (for use from workers / background jobs). */
export async function insertNotification(payload: InAppPayload): Promise<void> {
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    ...payload,
  });
}

/** Insert multiple in-app notifications in one statement. */
export async function insertNotifications(payloads: InAppPayload[]): Promise<void> {
  if (payloads.length === 0) return;
  await db.insert(notifications).values(payloads.map((p) => ({ id: crypto.randomUUID(), ...p })));
}
