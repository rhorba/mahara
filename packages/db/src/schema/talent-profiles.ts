import type { SkillEntry } from "@mahara/core";
import { sql } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { availabilityEnum, verificationStatusEnum } from "./enums";
import { users } from "./users";

// pgvector custom type — used by Sprint 3 matching engine
export const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(",").map(Number);
  },
});

export const talentProfiles = pgTable(
  "talent_profiles",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    bio: text("bio"),
    skills: jsonb("skills").$type<SkillEntry[]>().notNull().default(sql`'[]'::jsonb`),
    portfolioUrls: text("portfolio_urls").array().notNull().default(sql`ARRAY[]::text[]`),
    languages: text("languages").array().notNull().default(sql`ARRAY['fr']::text[]`),
    hourlyRate: integer("hourly_rate"), // centimes — optional indicative rate
    availability: availabilityEnum("availability").notNull().default("available"),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("unverified"),
    skillVector: vector("skill_vector", { dimensions: 1536 }), // Sprint 3
    reviewCount: integer("review_count").notNull().default(0),
    avgRating: integer("avg_rating").notNull().default(0), // 0-500 (x100)
    responseRate: integer("response_rate").notNull().default(0), // 0-100
    onTimeRate: integer("on_time_rate").notNull().default(0), // 0-100
    completedGigs: integer("completed_gigs").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_talent_profiles_user").on(t.userId),
    index("idx_talent_profiles_availability").on(t.availability),
    index("idx_talent_profiles_verification").on(t.verificationStatus),
  ],
);

export type TalentProfile = typeof talentProfiles.$inferSelect;
export type NewTalentProfile = typeof talentProfiles.$inferInsert;
