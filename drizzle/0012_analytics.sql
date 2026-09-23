CREATE TABLE IF NOT EXISTS "analytics_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "session_id" varchar(80) NOT NULL UNIQUE,
  "anonymous_visitor_id" varchar(80) NOT NULL,
  "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "last_activity_at" timestamp DEFAULT now() NOT NULL,
  "ended_at" timestamp,
  "page_count" integer DEFAULT 0 NOT NULL,
  "event_count" integer DEFAULT 0 NOT NULL,
  "device_type" varchar(20),
  "browser" varchar(40),
  "os" varchar(40),
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "analytics_session_activity_idx" ON "analytics_sessions" ("last_activity_at");
CREATE INDEX IF NOT EXISTS "analytics_session_visitor_idx" ON "analytics_sessions" ("anonymous_visitor_id", "started_at");

CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "anonymous_visitor_id" varchar(80) NOT NULL,
  "session_id" varchar(80) NOT NULL,
  "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "event_name" varchar(100) NOT NULL,
  "event_category" varchar(40) DEFAULT 'product' NOT NULL,
  "page_path" varchar(300),
  "referrer" varchar(500),
  "utm_source" varchar(100),
  "utm_medium" varchar(100),
  "utm_campaign" varchar(150),
  "device_type" varchar(20),
  "browser" varchar(40),
  "os" varchar(40),
  "screen_width" integer,
  "screen_height" integer,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "analytics_event_time_idx" ON "analytics_events" ("created_at");
CREATE INDEX IF NOT EXISTS "analytics_event_name_time_idx" ON "analytics_events" ("event_name", "created_at");
CREATE INDEX IF NOT EXISTS "analytics_event_session_idx" ON "analytics_events" ("session_id", "created_at");
CREATE INDEX IF NOT EXISTS "analytics_event_user_idx" ON "analytics_events" ("user_id", "created_at");
