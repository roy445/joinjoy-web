CREATE TABLE IF NOT EXISTS "analysis_usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"page_path" varchar(300),
	"platform" varchar(40),
	"status" varchar(20) DEFAULT 'started' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "error_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text NOT NULL,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"service" varchar(50) DEFAULT 'site' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "error_definitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "error_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"kind" varchar(20) NOT NULL,
	"error_code" varchar(20),
	"error_name" varchar(150),
	"page_path" varchar(300),
	"email" varchar(255),
	"message" text NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" varchar(50) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"active_error_code" varchar(20),
	"public_message" text,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_controls_service_unique" UNIQUE("service")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(180) NOT NULL,
	"content" text NOT NULL,
	"kind" varchar(20) DEFAULT 'manual' NOT NULL,
	"error_code" varchar(20),
	"severity" varchar(20) DEFAULT 'low' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analysis_usage_logs_user_id_users_id_fk') THEN
    ALTER TABLE "analysis_usage_logs" ADD CONSTRAINT "analysis_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'error_reports_user_id_users_id_fk') THEN
    ALTER TABLE "error_reports" ADD CONSTRAINT "error_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_controls_updated_by_users_id_fk') THEN
    ALTER TABLE "service_controls" ADD CONSTRAINT "service_controls_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_announcements_created_by_users_id_fk') THEN
    ALTER TABLE "system_announcements" ADD CONSTRAINT "system_announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
