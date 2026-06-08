import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { verificationMethodEnum, verificationReviewStatusEnum } from "./enums";
import { talentProfiles } from "./talent-profiles";

export const skillVerifications = pgTable(
  "skill_verifications",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    talentId: uuid("talent_id")
      .notNull()
      .references(() => talentProfiles.id, { onDelete: "cascade" }),
    skill: text("skill").notNull(),
    method: verificationMethodEnum("method").notNull(),
    status: verificationReviewStatusEnum("status").notNull().default("pending"),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_skill_verif_talent").on(t.talentId),
    index("idx_skill_verif_status").on(t.status),
  ],
);

export type SkillVerification = typeof skillVerifications.$inferSelect;
export type NewSkillVerification = typeof skillVerifications.$inferInsert;
