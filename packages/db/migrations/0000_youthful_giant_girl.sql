-- ─── S0-06: Extensions + App Role ─────────────────────────────────────────
-- Enable pgvector (required for Sprint 3 AI matching — installed now, used later)
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint

-- Application role: connects with limited privileges; BYPASSRLS=false
-- In dev the DATABASE_URL uses postgres superuser (bypasses RLS).
-- In prod, rotate to mahara_app after granting table privileges.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mahara_app') THEN
    CREATE ROLE mahara_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $$;--> statement-breakpoint

-- ─── S0-04: Schema ─────────────────────────────────────────────────────────
CREATE TYPE "public"."user_role" AS ENUM('talent', 'business', 'admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"password_hash" text,
	"role" "user_role" DEFAULT 'talent' NOT NULL,
	"city" text,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_user" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint

-- ─── S0-05: RLS Foundation ─────────────────────────────────────────────────
-- Grant table privileges to mahara_app role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mahara_app;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mahara_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mahara_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO mahara_app;--> statement-breakpoint

-- Enable + force RLS on users (accounts/sessions/verificationTokens are Auth.js-managed)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- SELECT: user sees own record; admin sees all
-- When app.current_user is unset (e.g. signup via superuser) this policy
-- evaluates to false, but superuser bypasses RLS entirely — correct behaviour.
CREATE POLICY "users_select" ON "users" FOR SELECT
  USING (
    id::text = current_setting('app.current_user', true)
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint

-- INSERT: allowed (signup — no user context yet, runs via superuser or permissive path)
CREATE POLICY "users_insert" ON "users" FOR INSERT
  WITH CHECK (true);--> statement-breakpoint

-- UPDATE: user can update own record; admin can update any
CREATE POLICY "users_update" ON "users" FOR UPDATE
  USING (
    id::text = current_setting('app.current_user', true)
    OR current_setting('app.current_role', true) = 'admin'
  );--> statement-breakpoint

-- No DELETE policy — users are deactivated via is_active, never hard-deleted
