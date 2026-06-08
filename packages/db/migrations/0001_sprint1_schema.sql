-- ─── Sprint 1: Full Data Model ───────────────────────────────────────────────
-- Tables: talent_profiles, business_profiles, gigs, proposals, escrows,
--         message_threads, messages, reviews, skill_verifications,
--         notifications, audit_logs
-- RLS policies on every table; pgvector columns for Sprint 3 matching.

-- ─── New Enums ────────────────────────────────────────────────────────────────

CREATE TYPE "public"."skill_level" AS ENUM('junior', 'intermediate', 'advanced', 'expert');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending', 'verified', 'top_talent');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('available', 'in_project', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."business_size" AS ENUM('1', '2-10', '11-50', '50+');--> statement-breakpoint
CREATE TYPE "public"."gig_category" AS ENUM('design', 'development', 'marketing', 'data', 'content', 'translation', 'admin', 'other');--> statement-breakpoint
CREATE TYPE "public"."gig_status" AS ENUM('draft', 'open', 'in_progress', 'completed', 'cancelled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('pending', 'accepted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."escrow_status" AS ENUM('pending', 'funded', 'released', 'refunded', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('portfolio', 'test', 'admin_review');--> statement-breakpoint
CREATE TYPE "public"."verification_review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('gig_match', 'proposal_accepted', 'proposal_rejected', 'new_message', 'payment_released', 'review_requested', 'verification_approved', 'gig_completed');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'approve', 'release', 'dispute');--> statement-breakpoint

-- ─── talent_profiles ─────────────────────────────────────────────────────────

CREATE TABLE "talent_profiles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL UNIQUE,
  "bio" text,
  "skills" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "portfolio_urls" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "languages" text[] NOT NULL DEFAULT ARRAY['fr']::text[],
  "hourly_rate" integer,
  "availability" "availability_status" NOT NULL DEFAULT 'available',
  "verification_status" "verification_status" NOT NULL DEFAULT 'unverified',
  "skill_vector" vector(1536),
  "review_count" integer NOT NULL DEFAULT 0,
  "avg_rating" integer NOT NULL DEFAULT 0,
  "response_rate" integer NOT NULL DEFAULT 0,
  "on_time_rate" integer NOT NULL DEFAULT 0,
  "completed_gigs" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "talent_profiles" ADD CONSTRAINT "talent_profiles_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_talent_profiles_user" ON "talent_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_talent_profiles_availability" ON "talent_profiles" USING btree ("availability");--> statement-breakpoint
CREATE INDEX "idx_talent_profiles_verification" ON "talent_profiles" USING btree ("verification_status");--> statement-breakpoint
-- HNSW index for similarity search (Sprint 3) — created now, populated later
CREATE INDEX "idx_talent_profiles_skill_vector" ON "talent_profiles"
  USING hnsw ("skill_vector" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE "skill_vector" IS NOT NULL;--> statement-breakpoint

-- ─── business_profiles ───────────────────────────────────────────────────────

CREATE TABLE "business_profiles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL UNIQUE,
  "company_name" text NOT NULL,
  "sector" text,
  "size" "business_size",
  "ice" text,
  "website" text,
  "verified_business" boolean NOT NULL DEFAULT false,
  "posted_gigs" integer NOT NULL DEFAULT 0,
  "avg_rating" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_business_profiles_user" ON "business_profiles" USING btree ("user_id");--> statement-breakpoint

-- ─── gigs ────────────────────────────────────────────────────────────────────

CREATE TABLE "gigs" (
  "id" uuid PRIMARY KEY NOT NULL,
  "business_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "category" "gig_category" NOT NULL,
  "skills" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "budget" integer NOT NULL,
  "duration" text,
  "deadline" timestamp with time zone,
  "urgent" boolean NOT NULL DEFAULT false,
  "status" "gig_status" NOT NULL DEFAULT 'draft',
  "assigned_talent_id" uuid,
  "requirement_vector" vector(1536),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_business_id_business_profiles_id_fk"
  FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_assigned_talent_id_talent_profiles_id_fk"
  FOREIGN KEY ("assigned_talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_gigs_business" ON "gigs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_gigs_status" ON "gigs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_gigs_category" ON "gigs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_gigs_budget" ON "gigs" USING btree ("budget");--> statement-breakpoint
CREATE INDEX "idx_gigs_urgent" ON "gigs" USING btree ("urgent");--> statement-breakpoint
CREATE INDEX "idx_gigs_requirement_vector" ON "gigs"
  USING hnsw ("requirement_vector" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE "requirement_vector" IS NOT NULL;--> statement-breakpoint

-- ─── proposals ───────────────────────────────────────────────────────────────

CREATE TABLE "proposals" (
  "id" uuid PRIMARY KEY NOT NULL,
  "gig_id" uuid NOT NULL,
  "talent_id" uuid NOT NULL,
  "cover_letter" text,
  "proposed_budget" integer,
  "estimated_days" integer,
  "status" "proposal_status" NOT NULL DEFAULT 'pending',
  "match_score" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uniq_proposal_gig_talent" UNIQUE ("gig_id", "talent_id")
);
--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_gig_id_gigs_id_fk"
  FOREIGN KEY ("gig_id") REFERENCES "public"."gigs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_talent_id_talent_profiles_id_fk"
  FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_proposals_gig" ON "proposals" USING btree ("gig_id");--> statement-breakpoint
CREATE INDEX "idx_proposals_talent" ON "proposals" USING btree ("talent_id");--> statement-breakpoint
CREATE INDEX "idx_proposals_status" ON "proposals" USING btree ("status");--> statement-breakpoint

-- ─── escrows ─────────────────────────────────────────────────────────────────

CREATE TABLE "escrows" (
  "id" uuid PRIMARY KEY NOT NULL,
  "gig_id" uuid NOT NULL,
  "proposal_id" uuid NOT NULL UNIQUE,
  "business_id" uuid NOT NULL,
  "talent_id" uuid NOT NULL,
  "gross_amount" integer NOT NULL,
  "platform_fee_from_business" integer NOT NULL,
  "platform_fee_from_talent" integer NOT NULL,
  "talent_payout" integer NOT NULL,
  "status" "escrow_status" NOT NULL DEFAULT 'pending',
  "funded_at" timestamp with time zone,
  "released_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_gig_id_gigs_id_fk"
  FOREIGN KEY ("gig_id") REFERENCES "public"."gigs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_proposal_id_proposals_id_fk"
  FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_business_id_users_id_fk"
  FOREIGN KEY ("business_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_talent_id_users_id_fk"
  FOREIGN KEY ("talent_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_escrows_gig" ON "escrows" USING btree ("gig_id");--> statement-breakpoint
CREATE INDEX "idx_escrows_business" ON "escrows" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_escrows_talent" ON "escrows" USING btree ("talent_id");--> statement-breakpoint
CREATE INDEX "idx_escrows_status" ON "escrows" USING btree ("status");--> statement-breakpoint

-- ─── message_threads ─────────────────────────────────────────────────────────

CREATE TABLE "message_threads" (
  "id" uuid PRIMARY KEY NOT NULL,
  "gig_id" uuid NOT NULL,
  "proposal_id" uuid NOT NULL UNIQUE,
  "talent_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_gig_id_gigs_id_fk"
  FOREIGN KEY ("gig_id") REFERENCES "public"."gigs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_proposal_id_proposals_id_fk"
  FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_talent_id_users_id_fk"
  FOREIGN KEY ("talent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_business_id_users_id_fk"
  FOREIGN KEY ("business_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_threads_gig" ON "message_threads" USING btree ("gig_id");--> statement-breakpoint
CREATE INDEX "idx_threads_talent" ON "message_threads" USING btree ("talent_id");--> statement-breakpoint
CREATE INDEX "idx_threads_business" ON "message_threads" USING btree ("business_id");--> statement-breakpoint

-- ─── messages ────────────────────────────────────────────────────────────────

CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY NOT NULL,
  "thread_id" uuid NOT NULL,
  "sender_id" uuid NOT NULL,
  "body" text NOT NULL,
  "attachment_url" text,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_message_threads_id_fk"
  FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk"
  FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_messages_thread" ON "messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_messages_sender" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_messages_created" ON "messages" USING btree ("created_at");--> statement-breakpoint

-- ─── reviews ─────────────────────────────────────────────────────────────────

CREATE TABLE "reviews" (
  "id" uuid PRIMARY KEY NOT NULL,
  "gig_id" uuid NOT NULL,
  "reviewer_id" uuid NOT NULL,
  "reviewee_id" uuid NOT NULL,
  "rating" integer NOT NULL,
  "comment" text,
  "reviewer_role" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uniq_review_gig_reviewer" UNIQUE ("gig_id", "reviewer_id")
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_gig_id_gigs_id_fk"
  FOREIGN KEY ("gig_id") REFERENCES "public"."gigs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk"
  FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_users_id_fk"
  FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_reviews_gig" ON "reviews" USING btree ("gig_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_reviewer" ON "reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_reviewee" ON "reviews" USING btree ("reviewee_id");--> statement-breakpoint

-- ─── skill_verifications ─────────────────────────────────────────────────────

CREATE TABLE "skill_verifications" (
  "id" uuid PRIMARY KEY NOT NULL,
  "talent_id" uuid NOT NULL,
  "skill" text NOT NULL,
  "method" "verification_method" NOT NULL,
  "status" "verification_review_status" NOT NULL DEFAULT 'pending',
  "admin_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skill_verifications" ADD CONSTRAINT "skill_verifications_talent_id_talent_profiles_id_fk"
  FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_skill_verif_talent" ON "skill_verifications" USING btree ("talent_id");--> statement-breakpoint
CREATE INDEX "idx_skill_verif_status" ON "skill_verifications" USING btree ("status");--> statement-breakpoint

-- ─── notifications ───────────────────────────────────────────────────────────

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "type" "notification_type" NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "link_url" text,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_read" ON "notifications" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "notifications" USING btree ("created_at");--> statement-breakpoint

-- ─── audit_logs ──────────────────────────────────────────────────────────────

CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "entity" text NOT NULL,
  "entity_id" text NOT NULL,
  "action" "audit_action" NOT NULL,
  "before_data" jsonb,
  "after_data" jsonb,
  "at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk"
  FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity", "entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_at" ON "audit_logs" USING btree ("at");--> statement-breakpoint

-- ─── RLS: Enable + Force on all new tables ───────────────────────────────────

ALTER TABLE "talent_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "talent_profiles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "business_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "business_profiles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "gigs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "gigs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "proposals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "proposals" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "escrows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "escrows" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message_threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message_threads" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reviews" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "skill_verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "skill_verifications" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- ─── RLS Policies ────────────────────────────────────────────────────────────

-- talent_profiles: public read; talent writes own; admin all
CREATE POLICY "talent_profiles_select" ON "talent_profiles" FOR SELECT
  USING (true);--> statement-breakpoint
CREATE POLICY "talent_profiles_insert" ON "talent_profiles" FOR INSERT
  WITH CHECK (
    user_id::text = current_setting('app.current_user', true)
  );--> statement-breakpoint
CREATE POLICY "talent_profiles_update" ON "talent_profiles" FOR UPDATE
  USING (
    user_id::text = current_setting('app.current_user', true)
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint

-- business_profiles: public read; business writes own; admin all
CREATE POLICY "business_profiles_select" ON "business_profiles" FOR SELECT
  USING (true);--> statement-breakpoint
CREATE POLICY "business_profiles_insert" ON "business_profiles" FOR INSERT
  WITH CHECK (
    user_id::text = current_setting('app.current_user', true)
  );--> statement-breakpoint
CREATE POLICY "business_profiles_update" ON "business_profiles" FOR UPDATE
  USING (
    user_id::text = current_setting('app.current_user', true)
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint

-- gigs: public read for non-draft; business writes own; admin all
CREATE POLICY "gigs_select" ON "gigs" FOR SELECT
  USING (
    status != 'draft'
    OR business_id IN (
      SELECT id FROM business_profiles
      WHERE user_id::text = current_setting('app.current_user', true)
    )
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint
CREATE POLICY "gigs_insert" ON "gigs" FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM business_profiles
      WHERE user_id::text = current_setting('app.current_user', true)
    )
  );--> statement-breakpoint
CREATE POLICY "gigs_update" ON "gigs" FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM business_profiles
      WHERE user_id::text = current_setting('app.current_user', true)
    )
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint

-- proposals: talent sees own; business sees proposals to own gigs; admin all
CREATE POLICY "proposals_select" ON "proposals" FOR SELECT
  USING (
    talent_id IN (
      SELECT id FROM talent_profiles
      WHERE user_id::text = current_setting('app.current_user', true)
    )
    OR gig_id IN (
      SELECT g.id FROM gigs g
      JOIN business_profiles bp ON g.business_id = bp.id
      WHERE bp.user_id::text = current_setting('app.current_user', true)
    )
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint
CREATE POLICY "proposals_insert" ON "proposals" FOR INSERT
  WITH CHECK (
    talent_id IN (
      SELECT id FROM talent_profiles
      WHERE user_id::text = current_setting('app.current_user', true)
    )
  );--> statement-breakpoint
CREATE POLICY "proposals_update" ON "proposals" FOR UPDATE
  USING (
    -- talent can withdraw own proposal
    talent_id IN (
      SELECT id FROM talent_profiles
      WHERE user_id::text = current_setting('app.current_user', true)
    )
    -- business can accept/reject proposals to own gigs
    OR gig_id IN (
      SELECT g.id FROM gigs g
      JOIN business_profiles bp ON g.business_id = bp.id
      WHERE bp.user_id::text = current_setting('app.current_user', true)
    )
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint

-- escrows: business and talent involved can SELECT; admin all; INSERT/UPDATE via server actions only
CREATE POLICY "escrows_select" ON "escrows" FOR SELECT
  USING (
    business_id::text = current_setting('app.current_user', true)
    OR talent_id::text = current_setting('app.current_user', true)
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint
CREATE POLICY "escrows_insert" ON "escrows" FOR INSERT
  WITH CHECK (
    business_id::text = current_setting('app.current_user', true)
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint
CREATE POLICY "escrows_update" ON "escrows" FOR UPDATE
  USING (current_setting('app.current_role', true) = 'admin'
    OR business_id::text = current_setting('app.current_user', true)
  );--> statement-breakpoint

-- message_threads: participants only; admin all
CREATE POLICY "message_threads_select" ON "message_threads" FOR SELECT
  USING (
    talent_id::text = current_setting('app.current_user', true)
    OR business_id::text = current_setting('app.current_user', true)
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint
CREATE POLICY "message_threads_insert" ON "message_threads" FOR INSERT
  WITH CHECK (current_setting('app.current_role', true) IN ('admin', 'business'));--> statement-breakpoint

-- messages: thread participants only
CREATE POLICY "messages_select" ON "messages" FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM message_threads
      WHERE talent_id::text = current_setting('app.current_user', true)
         OR business_id::text = current_setting('app.current_user', true)
    )
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint
CREATE POLICY "messages_insert" ON "messages" FOR INSERT
  WITH CHECK (
    sender_id::text = current_setting('app.current_user', true)
    AND thread_id IN (
      SELECT id FROM message_threads
      WHERE talent_id::text = current_setting('app.current_user', true)
         OR business_id::text = current_setting('app.current_user', true)
    )
  );--> statement-breakpoint

-- reviews: public read; participants can insert post-gig (enforced at app layer too)
CREATE POLICY "reviews_select" ON "reviews" FOR SELECT
  USING (true);--> statement-breakpoint
CREATE POLICY "reviews_insert" ON "reviews" FOR INSERT
  WITH CHECK (
    reviewer_id::text = current_setting('app.current_user', true)
  );--> statement-breakpoint

-- skill_verifications: talent sees own; admin all
CREATE POLICY "skill_verifications_select" ON "skill_verifications" FOR SELECT
  USING (
    talent_id IN (
      SELECT id FROM talent_profiles
      WHERE user_id::text = current_setting('app.current_user', true)
    )
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint
CREATE POLICY "skill_verifications_insert" ON "skill_verifications" FOR INSERT
  WITH CHECK (
    talent_id IN (
      SELECT id FROM talent_profiles
      WHERE user_id::text = current_setting('app.current_user', true)
    )
  );--> statement-breakpoint
CREATE POLICY "skill_verifications_update" ON "skill_verifications" FOR UPDATE
  USING (current_setting('app.current_role', true) = 'admin');--> statement-breakpoint

-- notifications: user sees own only
CREATE POLICY "notifications_select" ON "notifications" FOR SELECT
  USING (
    user_id::text = current_setting('app.current_user', true)
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint
CREATE POLICY "notifications_insert" ON "notifications" FOR INSERT
  WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "notifications_update" ON "notifications" FOR UPDATE
  USING (user_id::text = current_setting('app.current_user', true));--> statement-breakpoint

-- audit_logs: admin read only; open insert (controlled by server action layer)
CREATE POLICY "audit_logs_select" ON "audit_logs" FOR SELECT
  USING (current_setting('app.current_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "audit_logs_insert" ON "audit_logs" FOR INSERT
  WITH CHECK (
    actor_user_id::text = current_setting('app.current_user', true)
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint
