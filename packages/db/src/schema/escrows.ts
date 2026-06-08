import { index, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { escrowStatusEnum } from "./enums";
import { gigs } from "./gigs";
import { proposals } from "./proposals";
import { users } from "./users";

export const escrows = pgTable(
  "escrows",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    gigId: uuid("gig_id")
      .notNull()
      .references(() => gigs.id),
    proposalId: uuid("proposal_id")
      .notNull()
      .unique()
      .references(() => proposals.id),
    businessId: uuid("business_id")
      .notNull()
      .references(() => users.id), // user.id — for direct RLS comparison
    talentId: uuid("talent_id")
      .notNull()
      .references(() => users.id), // user.id — for direct RLS comparison
    grossAmount: integer("gross_amount").notNull(), // total budget in centimes
    platformFeeFromBusiness: integer("platform_fee_from_business").notNull(), // 10%
    platformFeeFromTalent: integer("platform_fee_from_talent").notNull(), // 5%
    talentPayout: integer("talent_payout").notNull(), // grossAmount - platformFeeFromTalent
    status: escrowStatusEnum("status").notNull().default("pending"),
    fundedAt: timestamp("funded_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_escrows_gig").on(t.gigId),
    index("idx_escrows_business").on(t.businessId),
    index("idx_escrows_talent").on(t.talentId),
    index("idx_escrows_status").on(t.status),
  ],
);

export type Escrow = typeof escrows.$inferSelect;
export type NewEscrow = typeof escrows.$inferInsert;
