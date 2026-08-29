-- JoinJoy admin identity schema repair
--
-- 0002 uses CREATE TABLE IF NOT EXISTS. If a partially-created table already
-- existed, PostgreSQL kept that old shape and skipped the missing columns.
-- This migration repairs that situation without dropping data or tables.

BEGIN;

ALTER TABLE IF EXISTS "users"
  ADD COLUMN IF NOT EXISTS "j_coins" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "ai_titles" jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "active_title" varchar(100),
  ADD COLUMN IF NOT EXISTS "active_badge" varchar(100),
  ADD COLUMN IF NOT EXISTS "active_avatar_frame" varchar(100),
  ADD COLUMN IF NOT EXISTS "activity_stats" jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "ai_usage_limit" integer,
  ADD COLUMN IF NOT EXISTS "last_notification_seen_at" timestamp;

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

ALTER TABLE "user_groups"
  ADD COLUMN IF NOT EXISTS "icon" varchar(50),
  ADD COLUMN IF NOT EXISTS "color" varchar(20),
  ADD COLUMN IF NOT EXISTS "effect" varchar(50),
  ADD COLUMN IF NOT EXISTS "description" text,
  ADD COLUMN IF NOT EXISTS "daily_ai_limit" integer DEFAULT 50 NOT NULL,
  ADD COLUMN IF NOT EXISTS "j_coin_bonus" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "max_bonus_cap" integer DEFAULT 100 NOT NULL,
  ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "user_groups_name_unique_idx" ON "user_groups" ("name");

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

ALTER TABLE "user_group_members"
  ADD COLUMN IF NOT EXISTS "user_id" integer,
  ADD COLUMN IF NOT EXISTS "group_id" integer,
  ADD COLUMN IF NOT EXISTS "assigned_by" integer,
  ADD COLUMN IF NOT EXISTS "assigned_reason" text,
  ADD COLUMN IF NOT EXISTS "expires_at" timestamp,
  ADD COLUMN IF NOT EXISTS "revoked_at" timestamp,
  ADD COLUMN IF NOT EXISTS "revoked_by" integer,
  ADD COLUMN IF NOT EXISTS "revocation_reason" text,
  ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

CREATE INDEX IF NOT EXISTS "user_group_members_user_idx" ON "user_group_members" ("user_id");
CREATE INDEX IF NOT EXISTS "user_group_members_group_idx" ON "user_group_members" ("group_id");
CREATE INDEX IF NOT EXISTS "user_group_members_active_idx" ON "user_group_members" ("user_id", "group_id", "revoked_at", "expires_at");

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

ALTER TABLE "j_coin_transactions"
  ADD COLUMN IF NOT EXISTS "user_id" integer,
  ADD COLUMN IF NOT EXISTS "amount" integer,
  ADD COLUMN IF NOT EXISTS "type" varchar(20),
  ADD COLUMN IF NOT EXISTS "reason" varchar(255),
  ADD COLUMN IF NOT EXISTS "admin_id" integer,
  ADD COLUMN IF NOT EXISTS "event_id" integer,
  ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

CREATE INDEX IF NOT EXISTS "j_coin_transactions_user_created_idx" ON "j_coin_transactions" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "j_coin_transactions_created_idx" ON "j_coin_transactions" ("created_at");

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

ALTER TABLE "honor_notifications"
  ADD COLUMN IF NOT EXISTS "user_id" integer,
  ADD COLUMN IF NOT EXISTS "type" varchar(50),
  ADD COLUMN IF NOT EXISTS "target_id" varchar(100),
  ADD COLUMN IF NOT EXISTS "title" varchar(150),
  ADD COLUMN IF NOT EXISTS "content" text,
  ADD COLUMN IF NOT EXISTS "is_seen" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

CREATE INDEX IF NOT EXISTS "honor_notifications_user_seen_idx" ON "honor_notifications" ("user_id", "is_seen", "created_at");

DO $$ BEGIN
  ALTER TABLE "user_group_members"
    ADD CONSTRAINT "user_group_members_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_group_members"
    ADD CONSTRAINT "user_group_members_group_id_user_groups_id_fk"
    FOREIGN KEY ("group_id") REFERENCES "public"."user_groups"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_group_members"
    ADD CONSTRAINT "user_group_members_assigned_by_users_id_fk"
    FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_group_members"
    ADD CONSTRAINT "user_group_members_revoked_by_users_id_fk"
    FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "j_coin_transactions"
    ADD CONSTRAINT "j_coin_transactions_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "j_coin_transactions"
    ADD CONSTRAINT "j_coin_transactions_admin_id_users_id_fk"
    FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "j_coin_transactions"
    ADD CONSTRAINT "j_coin_transactions_event_id_events_id_fk"
    FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "honor_notifications"
    ADD CONSTRAINT "honor_notifications_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
