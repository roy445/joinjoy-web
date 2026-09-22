CREATE TABLE IF NOT EXISTS "legal_document_versions" (
  "id" serial PRIMARY KEY NOT NULL,
  "document_type" varchar(40) NOT NULL,
  "version" varchar(30) NOT NULL,
  "title" varchar(150) NOT NULL,
  "effective_at" timestamp DEFAULT now() NOT NULL,
  "is_current" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "legal_document_version_idx" ON "legal_document_versions" ("document_type", "version");
INSERT INTO "legal_document_versions" ("document_type", "version", "title") VALUES
  ('terms', '2026-09-22', '使用條款'),
  ('privacy', '2026-09-22', '隱私權政策'),
  ('safety', '2026-09-22', '安全與反詐騙規範')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS "user_legal_acceptances" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "document_type" varchar(40) NOT NULL,
  "document_version" varchar(30) NOT NULL,
  "context" varchar(40) DEFAULT 'registration' NOT NULL,
  "accepted_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "user_legal_acceptance_user_idx" ON "user_legal_acceptances" ("user_id", "document_type");

CREATE TABLE IF NOT EXISTS "report_actions" (
  "id" serial PRIMARY KEY NOT NULL,
  "report_id" integer NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
  "admin_id" integer NOT NULL REFERENCES "users"("id"),
  "action" varchar(40) NOT NULL,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "security_audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "action" varchar(80) NOT NULL,
  "target_type" varchar(40),
  "target_id" integer,
  "context" varchar(40),
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "security_audit_actor_idx" ON "security_audit_logs" ("actor_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "security_audit_target_idx" ON "security_audit_logs" ("target_type", "target_id");
