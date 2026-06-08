// Core domain types for Mahara — never use raw numbers for money

/** Integer centimes (MAD). 1 MAD = 100 centimes. NEVER a float. */
export type Money = number & { readonly __brand: "Money" };

export type Role = "talent" | "business" | "admin";

export type SkillLevel = "junior" | "intermediate" | "advanced" | "expert";

export type VerificationStatus = "unverified" | "pending" | "verified" | "top_talent";

export type Locale = "fr" | "ar" | "en";

export type GigCategory =
  | "design"
  | "development"
  | "marketing"
  | "data"
  | "content"
  | "translation"
  | "admin"
  | "other";

export type GigStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled" | "disputed";

export type ProposalStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export type EscrowStatus = "pending" | "funded" | "released" | "refunded" | "disputed";

export type NotificationType =
  | "gig_match"
  | "proposal_accepted"
  | "proposal_rejected"
  | "new_message"
  | "payment_released"
  | "review_requested"
  | "verification_approved"
  | "gig_completed";

export type SkillEntry = {
  skill: string;
  level: SkillLevel;
  verified: boolean;
};

export type Session = {
  userId: string;
  role: Role;
  email: string;
  name: string;
};
