import { index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { gigs } from "./gigs";
import { users } from "./users";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    gigId: uuid("gig_id")
      .notNull()
      .references(() => gigs.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id),
    revieweeId: uuid("reviewee_id")
      .notNull()
      .references(() => users.id),
    rating: integer("rating").notNull(), // 1-5
    comment: text("comment"),
    reviewerRole: text("reviewer_role").notNull(), // 'talent' | 'business'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_reviews_gig").on(t.gigId),
    index("idx_reviews_reviewer").on(t.reviewerId),
    index("idx_reviews_reviewee").on(t.revieweeId),
    unique("uniq_review_gig_reviewer").on(t.gigId, t.reviewerId),
  ],
);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
