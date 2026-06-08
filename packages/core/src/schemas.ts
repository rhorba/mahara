import { z } from "zod";

// Reusable field schemas
export const emailSchema = z.string().email().toLowerCase().trim();
export const passwordSchema = z.string().min(8).max(128);
export const phoneSchema = z
  .string()
  .regex(/^\+212[0-9]{9}$/, "Moroccan phone number required (+212XXXXXXXXX)")
  .optional();

export const roleSchema = z.enum(["talent", "business", "admin"]);
export const localeSchema = z.enum(["fr", "ar", "en"]);
export const skillLevelSchema = z.enum(["junior", "intermediate", "advanced", "expert"]);
export const verificationStatusSchema = z.enum(["unverified", "pending", "verified", "top_talent"]);
export const gigStatusSchema = z.enum([
  "draft",
  "open",
  "in_progress",
  "completed",
  "cancelled",
  "disputed",
]);
export const gigCategorySchema = z.enum([
  "design",
  "development",
  "marketing",
  "data",
  "content",
  "translation",
  "admin",
  "other",
]);
export const proposalStatusSchema = z.enum(["pending", "accepted", "rejected", "withdrawn"]);
export const escrowStatusSchema = z.enum(["pending", "funded", "released", "refunded", "disputed"]);

// Money: positive integer centimes
export const moneySchema = z
  .number()
  .int("Money must be an integer (centimes)")
  .nonnegative("Money cannot be negative");

// Auth
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2).max(100).trim(),
  role: z.enum(["talent", "business"]),
  city: z.string().min(2).max(100).trim().optional(),
  phone: phoneSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Skill entry
export const skillEntrySchema = z.object({
  skill: z.string().min(1).max(100).trim(),
  level: skillLevelSchema,
  verified: z.boolean().default(false),
});

// Talent profile update
export const talentProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  skills: z.array(skillEntrySchema).max(20),
  portfolioUrls: z.array(z.string().url()).max(10),
  languages: z.array(z.string().min(2).max(5)).max(5),
  hourlyRate: moneySchema.optional(),
  availability: z.enum(["available", "in_project", "unavailable"]),
});

// Business profile update
export const businessProfileSchema = z.object({
  companyName: z.string().min(2).max(200).trim(),
  sector: z.string().max(100).optional(),
  size: z.enum(["1", "2-10", "11-50", "50+"]).optional(),
  ice: z
    .string()
    .regex(/^[0-9]{9}$/)
    .optional(),
  website: z.string().url().optional(),
});

// Gig
export const gigSchema = z.object({
  title: z.string().min(10).max(200).trim(),
  description: z.string().min(50).max(5000).trim(),
  category: gigCategorySchema,
  skills: z.array(z.string().min(1).max(100)).min(1).max(10),
  budget: moneySchema.min(5000, "Minimum budget is 50 MAD"),
  duration: z.string().max(100).optional(),
  deadline: z.coerce.date().optional(),
  urgent: z.boolean().default(false),
});

// Proposal
export const proposalSchema = z.object({
  gigId: z.string().uuid(),
  coverLetter: z.string().max(2000).optional(),
  proposedBudget: moneySchema.optional(),
  estimatedDays: z.number().int().positive().max(365).optional(),
});

// Review
export const reviewSchema = z.object({
  gigId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TalentProfileInput = z.infer<typeof talentProfileSchema>;
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
export type GigInput = z.infer<typeof gigSchema>;
export type ProposalInput = z.infer<typeof proposalSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
