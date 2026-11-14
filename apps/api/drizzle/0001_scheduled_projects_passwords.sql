DO $$ BEGIN
  CREATE TYPE "public"."project_difficulty" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "days"
  ADD COLUMN IF NOT EXISTS "password_hash" text,
  ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;

ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;

-- Migrate existing is_published values to published_at if is_published still exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'days' AND column_name = 'is_published'
  ) THEN
    UPDATE "days" SET "published_at" = "created_at" WHERE "is_published" = true AND "published_at" IS NULL;
    ALTER TABLE "days" DROP COLUMN "is_published";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'is_published'
  ) THEN
    UPDATE "resources" SET "published_at" = "created_at" WHERE "is_published" = true AND "published_at" IS NULL;
    ALTER TABLE "resources" DROP COLUMN "is_published";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "mini_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "day_id" uuid REFERENCES "public"."days"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "summary" text,
  "instructions" text,
  "milestones" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "starter_repo_url" text,
  "demo_url" text,
  "spec_url" text,
  "solution_url" text,
  "attachment_url" text,
  "difficulty" "public"."project_difficulty" DEFAULT 'INTERMEDIATE' NOT NULL,
  "estimated_minutes" integer,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "due_date" timestamp with time zone,
  "order" integer DEFAULT 0 NOT NULL,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "day_unlock_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "day_id" uuid NOT NULL REFERENCES "public"."days"("id") ON DELETE CASCADE,
  "ip_address" text NOT NULL,
  "failed_attempts" integer DEFAULT 0 NOT NULL,
  "locked_until" timestamp with time zone,
  "last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "day_unlock_attempts_day_ip_idx"
  ON "day_unlock_attempts" ("day_id", "ip_address");
