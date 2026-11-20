ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "run_command" text,
  ADD COLUMN IF NOT EXISTS "github_repo_url" text,
  ADD COLUMN IF NOT EXISTS "github_branch" text,
  ADD COLUMN IF NOT EXISTS "github_path" text,
  ADD COLUMN IF NOT EXISTS "github_commit_sha" text,
  ADD COLUMN IF NOT EXISTS "github_pushed_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "resource_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "resource_id" uuid NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
  "path" text NOT NULL,
  "content" text NOT NULL,
  "language" text,
  "size_bytes" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "resource_files_resource_path_idx"
  ON "resource_files" ("resource_id", "path");
