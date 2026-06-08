import { index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { proposalStatusEnum } from "./enums";
import { gigs } from "./gigs";
import { talentProfiles } from "./talent-profiles";

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    gigId: uuid("gig_id")
      .notNull()
      .references(() => gigs.id, { onDelete: "cascade" }),
    talentId: uuid("talent_id")
      .notNull()
      .references(() => talentProfiles.id, { onDelete: "cascade" }),
    coverLetter: text("cover_letter"),
    proposedBudget: integer("proposed_budget"), // centimes — talent counter-proposal
    estimatedDays: integer("estimated_days"),
    status: proposalStatusEnum("status").notNull().default("pending"),
    matchScore: integer("match_score").notNull().default(0), // 0-100 computed by matching engine
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_proposals_gig").on(t.gigId),
    index("idx_proposals_talent").on(t.talentId),
    index("idx_proposals_status").on(t.status),
    unique("uniq_proposal_gig_talent").on(t.gigId, t.talentId),
  ],
);

export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
