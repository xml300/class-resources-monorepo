import { count } from "drizzle-orm";
import { db, pool } from "./index.js";
import { days, resources, miniProjects } from "./schema.js";
import { DAY_SCHEDULE } from "./daySchedule.js";
import { env } from "../env.js";
import { syncFromDrive } from "../services/driveSync.js";

async function seed() {
  const sync =
    process.argv.includes("--sync") || process.env.SYNC_SEED === "true";
  const force =
    process.argv.includes("--force") || process.env.FORCE_SEED === "true";

  if (sync) {
    console.log("Syncing course materials from Google Drive...");
    const result = await syncFromDrive({ force });
    console.log(
      `Drive sync completed in ${result.durationMs}ms: ` +
        `${result.scannedFiles} scanned, ${result.downloadedFiles} downloaded, ${result.skippedUnchanged} unchanged; ` +
        `${result.daysCreated} day(s) created, ${result.daysUpdated} updated; ` +
        `${result.resourcesCreated} resource(s) created, ${result.resourcesUpdated} updated; ` +
        `${result.miniProjectsCreated} mini-project(s) created, ${result.miniProjectsUpdated} updated.`
    );
    if (result.warnings.length > 0) {
      console.warn("Warnings:");
      for (const w of result.warnings) {
        console.warn(`  - ${w}`);
      }
    }
    return;
  }

  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(days);

  if (existingCount > 0 && !force) {
    console.log(
      `Database already has ${existingCount} day(s). Pass --sync to sync updates from Google Drive without deleting existing data, or --force to replace all data.`
    );
    return;
  }

  if (existingCount > 0 && force) {
    console.log("Clearing existing days, resources, and mini-projects...");
    await db.delete(miniProjects);
    await db.delete(resources);
    await db.delete(days);
  }

  console.log("Seeding Days 1–10 schedule (Mon–Fri, Nov 16–27, 2026 @ 9:00 AM UTC+1)...");
  for (const item of DAY_SCHEDULE) {
    await db.insert(days).values({
      dayNumber: item.dayNumber,
      title: item.title,
      date: item.date,
      summary: item.summary,
      publishedAt: item.publishedAt,
    });
  }

  if (env.GOOGLE_DRIVE_API_KEY) {
    console.log("GOOGLE_DRIVE_API_KEY detected; syncing materials from Google Drive...");
    const result = await syncFromDrive({ force: true });
    console.log(
      `Seed + Drive sync completed in ${result.durationMs}ms: ` +
        `${DAY_SCHEDULE.length} days, ${result.resourcesCreated} resources, and ${result.miniProjectsCreated} mini-projects.`
    );
    if (result.warnings.length > 0) {
      console.warn("Warnings:");
      for (const w of result.warnings) {
        console.warn(`  - ${w}`);
      }
    }
  } else {
    console.log(
      `Seeded ${DAY_SCHEDULE.length} days. Set GOOGLE_DRIVE_API_KEY and run "npm run db:sync" (or click Sync Materials in Admin) to import materials from Google Drive.`
    );
  }
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
