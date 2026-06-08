import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { businessProfiles } from "./business-profiles";
import { gigCategoryEnum, gigStatusEnum } from "./enums";
import { talentProfiles, vector } from "./talent-profiles";

export const gigs = pgTable(
  "gigs",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessProfiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: gigCategoryEnum("category").notNull(),
    skills: text("skills").array().notNull().default(sql`ARRAY[]::text[]`),
    budget: integer("budget").notNull(), // centimes (MAD)
    duration: text("duration"), // '1 week', '2 months', etc.
    deadline: timestamp("deadline", { withTimezone: true }),
    urgent: boolean("urgent").notNull().default(false),
    status: gigStatusEnum("status").notNull().default("draft"),
    assignedTalentId: uuid("assigned_talent_id").references(() => talentProfiles.id, {
      onDelete: "set null",
    }),
    requirementVector: vector("requirement_vector", { dimensions: 1536 }), // Sprint 3
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_gigs_business").on(t.businessId),
    index("idx_gigs_status").on(t.status),
    index("idx_gigs_category").on(t.category),
    index("idx_gigs_budget").on(t.budget),
    index("idx_gigs_urgent").on(t.urgent),
  ],
);

export type Gig = typeof gigs.$inferSelect;
export type NewGig = typeof gigs.$inferInsert;
