import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const businessSizeEnum = pgEnum("business_size", ["1", "2-10", "11-50", "50+"]);

export const businessProfiles = pgTable(
  "business_profiles",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    sector: text("sector"),
    size: businessSizeEnum("size"),
    ice: text("ice"), // Moroccan tax ID (ICE) — not PII, stored plaintext
    website: text("website"),
    verifiedBusiness: boolean("verified_business").notNull().default(false),
    postedGigs: integer("posted_gigs").notNull().default(0),
    avgRating: integer("avg_rating").notNull().default(0), // 0-500 (x100)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_business_profiles_user").on(t.userId)],
);

export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type NewBusinessProfile = typeof businessProfiles.$inferInsert;
