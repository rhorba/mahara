import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { gigs } from "./gigs";
import { proposals } from "./proposals";
import { users } from "./users";

export const messageThreads = pgTable(
  "message_threads",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    gigId: uuid("gig_id")
      .notNull()
      .references(() => gigs.id, { onDelete: "cascade" }),
    proposalId: uuid("proposal_id")
      .notNull()
      .unique()
      .references(() => proposals.id, { onDelete: "cascade" }),
    talentId: uuid("talent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // user.id — for RLS
    businessId: uuid("business_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // user.id — for RLS
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_threads_gig").on(t.gigId),
    index("idx_threads_talent").on(t.talentId),
    index("idx_threads_business").on(t.businessId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => messageThreads.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    attachmentUrl: text("attachment_url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_messages_thread").on(t.threadId),
    index("idx_messages_sender").on(t.senderId),
    index("idx_messages_created").on(t.createdAt),
  ],
);

export type MessageThread = typeof messageThreads.$inferSelect;
export type NewMessageThread = typeof messageThreads.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
