import { relations } from "drizzle-orm";
import { auditLogs } from "./audit-logs";
import { businessProfiles } from "./business-profiles";
import { escrows } from "./escrows";
import { gigs } from "./gigs";
import { messageThreads, messages } from "./messages";
import { notifications } from "./notifications";
import { proposals } from "./proposals";
import { reviews } from "./reviews";
import { skillVerifications } from "./skill-verifications";
import { talentProfiles } from "./talent-profiles";
import { users } from "./users";

export const usersRelations = relations(users, ({ one, many }) => ({
  talentProfile: one(talentProfiles, {
    fields: [users.id],
    references: [talentProfiles.userId],
  }),
  businessProfile: one(businessProfiles, {
    fields: [users.id],
    references: [businessProfiles.userId],
  }),
  sentMessages: many(messages),
  reviewsGiven: many(reviews, { relationName: "reviewer" }),
  reviewsReceived: many(reviews, { relationName: "reviewee" }),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
}));

export const talentProfilesRelations = relations(talentProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [talentProfiles.userId],
    references: [users.id],
  }),
  proposals: many(proposals),
  skillVerifications: many(skillVerifications),
}));

export const businessProfilesRelations = relations(businessProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [businessProfiles.userId],
    references: [users.id],
  }),
  gigs: many(gigs),
}));

export const gigsRelations = relations(gigs, ({ one, many }) => ({
  business: one(businessProfiles, {
    fields: [gigs.businessId],
    references: [businessProfiles.id],
  }),
  assignedTalent: one(talentProfiles, {
    fields: [gigs.assignedTalentId],
    references: [talentProfiles.id],
  }),
  proposals: many(proposals),
  escrow: one(escrows, {
    fields: [gigs.id],
    references: [escrows.gigId],
  }),
  messageThreads: many(messageThreads),
  reviews: many(reviews),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  gig: one(gigs, {
    fields: [proposals.gigId],
    references: [gigs.id],
  }),
  talent: one(talentProfiles, {
    fields: [proposals.talentId],
    references: [talentProfiles.id],
  }),
  escrow: one(escrows, {
    fields: [proposals.id],
    references: [escrows.proposalId],
  }),
  messageThread: one(messageThreads, {
    fields: [proposals.id],
    references: [messageThreads.proposalId],
  }),
}));

export const escrowsRelations = relations(escrows, ({ one }) => ({
  gig: one(gigs, {
    fields: [escrows.gigId],
    references: [gigs.id],
  }),
  proposal: one(proposals, {
    fields: [escrows.proposalId],
    references: [proposals.id],
  }),
  business: one(users, {
    fields: [escrows.businessId],
    references: [users.id],
    relationName: "businessEscrows",
  }),
  talent: one(users, {
    fields: [escrows.talentId],
    references: [users.id],
    relationName: "talentEscrows",
  }),
}));

export const messageThreadsRelations = relations(messageThreads, ({ one, many }) => ({
  gig: one(gigs, {
    fields: [messageThreads.gigId],
    references: [gigs.id],
  }),
  proposal: one(proposals, {
    fields: [messageThreads.proposalId],
    references: [proposals.id],
  }),
  talent: one(users, {
    fields: [messageThreads.talentId],
    references: [users.id],
    relationName: "talentThreads",
  }),
  business: one(users, {
    fields: [messageThreads.businessId],
    references: [users.id],
    relationName: "businessThreads",
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(messageThreads, {
    fields: [messages.threadId],
    references: [messageThreads.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  gig: one(gigs, {
    fields: [reviews.gigId],
    references: [gigs.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: "reviewer",
  }),
  reviewee: one(users, {
    fields: [reviews.revieweeId],
    references: [users.id],
    relationName: "reviewee",
  }),
}));

export const skillVerificationsRelations = relations(skillVerifications, ({ one }) => ({
  talentProfile: one(talentProfiles, {
    fields: [skillVerifications.talentId],
    references: [talentProfiles.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));
