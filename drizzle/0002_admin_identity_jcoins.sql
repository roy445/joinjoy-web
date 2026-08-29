-- JoinJoy admin identity grants and J-Coin audit support.
-- This migration is intentionally idempotent for databases that were partly
-- updated manually before the migration history was synchronized.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "j_coins" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_titles" jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_title" varchar(100);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_badge" varchar(100);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_avatar_frame" varchar(100);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activity_stats" jsonb DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ai_usage_limit" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_notification_seen_at" timestamp;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_groups" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "icon" varchar(50),
  "color" varchar(20),
  "effect" varchar(50),
  "description" text,
  "daily_ai_limit" integer DEFAULT 50 NOT NULL,
  "j_coin_bonus" integer DEFAULT 0 NOT NULL,
  "max_bonus_cap" integer DEFAULT 100 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_group_members" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "group_id" integer NOT NULL,
  "assigned_by" integer,
  "assigned_reason" text,
  "expires_at" timestamp,
  "revoked_at" timestamp,
  "revoked_by" integer,
  "revocation_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "j_coin_transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "amount" integer NOT NULL,
  "type" varchar(20) NOT NULL,
  "reason" varchar(255) NOT NULL,
  "admin_id" integer,
  "event_id" integer,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "honor_notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "type" varchar(50) NOT NULL,
  "target_id" varchar(100) NOT NULL,
  "title" varchar(150) NOT NULL,
  "content" text,
  "is_seen" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_group_members_user_idx" ON "user_group_members" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_group_members_group_idx" ON "user_group_members" ("group_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_group_members_active_idx" ON "user_group_members" ("user_id", "group_id", "revoked_at", "expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "j_coin_transactions_user_created_idx" ON "j_coin_transactions" ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "j_coin_transactions_created_idx" ON "j_coin_transactions" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "honor_notifications_user_seen_idx" ON "honor_notifications" ("user_id", "is_seen", "created_at");
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_group_id_user_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."user_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_group_members" ADD CONSTRAINT "user_group_members_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "j_coin_transactions" ADD CONSTRAINT "j_coin_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "j_coin_transactions" ADD CONSTRAINT "j_coin_transactions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "j_coin_transactions" ADD CONSTRAINT "j_coin_transactions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "honor_notifications" ADD CONSTRAINT "honor_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
