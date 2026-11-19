ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "drive_file_id" text,
  ADD COLUMN IF NOT EXISTS "drive_modified_time" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "drive_md5_checksum" text,
  ADD COLUMN IF NOT EXISTS "drive_source_path" text;

CREATE UNIQUE INDEX IF NOT EXISTS "resources_drive_file_id_idx"
  ON "resources" ("drive_file_id");

ALTER TABLE "mini_projects"
  ADD COLUMN IF NOT EXISTS "drive_file_id" text,
  ADD COLUMN IF NOT EXISTS "drive_modified_time" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "drive_md5_checksum" text,
  ADD COLUMN IF NOT EXISTS "drive_source_path" text;

CREATE UNIQUE INDEX IF NOT EXISTS "mini_projects_drive_file_id_idx"
  ON "mini_projects" ("drive_file_id");
