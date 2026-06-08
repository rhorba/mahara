import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { auditActionEnum } from "./enums";
import { users } from "./users";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    entity: text("entity").notNull(), // 'escrow', 'gig', 'proposal', etc.
    entityId: text("entity_id").notNull(),
    action: auditActionEnum("action").notNull(),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_audit_actor").on(t.actorUserId),
    index("idx_audit_entity").on(t.entity, t.entityId),
    index("idx_audit_at").on(t.at),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
