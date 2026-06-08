import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", ["talent", "business", "admin"]);

export const skillLevelEnum = pgEnum("skill_level", [
  "junior",
  "intermediate",
  "advanced",
  "expert",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "unverified",
  "pending",
  "verified",
  "top_talent",
]);

export const availabilityEnum = pgEnum("availability_status", [
  "available",
  "in_project",
  "unavailable",
]);

export const gigCategoryEnum = pgEnum("gig_category", [
  "design",
  "development",
  "marketing",
  "data",
  "content",
  "translation",
  "admin",
  "other",
]);

export const gigStatusEnum = pgEnum("gig_status", [
  "draft",
  "open",
  "in_progress",
  "completed",
  "cancelled",
  "disputed",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
]);

export const escrowStatusEnum = pgEnum("escrow_status", [
  "pending",
  "funded",
  "released",
  "refunded",
  "disputed",
]);

export const verificationMethodEnum = pgEnum("verification_method", [
  "portfolio",
  "test",
  "admin_review",
]);

export const verificationReviewStatusEnum = pgEnum("verification_review_status", [
  "pending",
  "approved",
  "rejected",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "gig_match",
  "proposal_accepted",
  "proposal_rejected",
  "new_message",
  "payment_released",
  "review_requested",
  "verification_approved",
  "gig_completed",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "approve",
  "release",
  "dispute",
]);
