import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const drizzleDir = path.resolve(__dirname, "../../drizzle");

async function migrate() {
  console.log("Running database migration against DATABASE_URL...");

  // Check if base schema (days table) exists; if not, apply 0000 first
  const { rows } = await pool.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'days'
    ) AS "exists";
  `);

  if (!rows[0]?.exists) {
    const initialSqlPath = path.join(drizzleDir, "0000_volatile_spitfire.sql");
    if (fs.existsSync(initialSqlPath)) {
      console.log("Applying 0000_volatile_spitfire.sql...");
      const initialSql = fs
        .readFileSync(initialSqlPath, "utf8")
        .replace(/--> statement-breakpoint/g, "");
      await pool.query(initialSql);
    }
  }

  const upgradeSqlPath = path.join(
    drizzleDir,
    "0001_scheduled_projects_passwords.sql"
  );
  console.log("Applying 0001_scheduled_projects_passwords.sql...");
  const upgradeSql = fs.readFileSync(upgradeSqlPath, "utf8");
  await pool.query(upgradeSql);

  const nullableUrlSqlPath = path.join(
    drizzleDir,
    "0002_nullable_resource_url.sql"
  );
  console.log("Applying 0002_nullable_resource_url.sql...");
  const nullableUrlSql = fs.readFileSync(nullableUrlSqlPath, "utf8");
  await pool.query(nullableUrlSql);

  const resourceLangSqlPath = path.join(
    drizzleDir,
    "0003_resource_language_filename.sql"
  );
  console.log("Applying 0003_resource_language_filename.sql...");
  const resourceLangSql = fs.readFileSync(resourceLangSqlPath, "utf8");
  await pool.query(resourceLangSql);

  const driveSyncSqlPath = path.join(
    drizzleDir,
    "0004_drive_sync_metadata.sql"
  );
  console.log("Applying 0004_drive_sync_metadata.sql...");
  const driveSyncSql = fs.readFileSync(driveSyncSqlPath, "utf8");
  await pool.query(driveSyncSql);

  console.log("Database migration completed successfully.");
}

migrate()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
