import { count } from "drizzle-orm";
import { db, pool } from "./index.js";
import { days, resources, miniProjects } from "./schema.js";
import { getDaySeeds, syncSeedMaterials } from "./syncMaterials.js";

async function seed() {
  const sync =
    process.argv.includes("--sync") || process.env.SYNC_SEED === "true";
  const force =
    process.argv.includes("--force") || process.env.FORCE_SEED === "true";

  if (sync) {
    console.log("Syncing updated course materials into the database...");
    const result = await syncSeedMaterials();
    console.log(
      `Sync completed: ${result.daysCreated} day(s) created, ${result.daysUpdated} updated; ` +
        `${result.resourcesCreated} resource(s) created, ${result.resourcesUpdated} updated; ` +
        `${result.miniProjectsCreated} mini-project(s) created, ${result.miniProjectsUpdated} updated.`
    );
    return;
  }

  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(days);

  if (existingCount > 0 && !force) {
    console.log(
      `Database already has ${existingCount} day(s). Pass --sync to upsert updates without deleting existing data, or --force to replace all data.`
    );
    return;
  }

  if (existingCount > 0 && force) {
    console.log("Clearing existing days, resources, and mini-projects...");
    await db.delete(miniProjects);
    await db.delete(resources);
    await db.delete(days);
  }

  const daySeeds = getDaySeeds();
  console.log("Seeding Days 1–10 (Mon–Fri, Nov 16–27, 2026 @ 9:00 AM UTC+1)...");

  let totalResources = 0;
  let totalMiniProjects = 0;

  for (const item of daySeeds) {
    const [createdDay] = await db
      .insert(days)
      .values({
        dayNumber: item.dayNumber,
        title: item.title,
        date: item.date,
        summary: item.summary,
        publishedAt: item.publishedAt,
      })
      .returning();

    const resourceValues = [
      {
        dayId: createdDay.id,
        title: item.slidesTitle,
        description: `Google Slides presentation for Day ${item.dayNumber}.`,
        type: "SLIDES" as const,
        url: item.slidesUrl,
        content: null,
        order: 1,
        publishedAt: item.publishedAt,
      },
      ...(item.extraResources ?? []).map((extra) => ({
        dayId: createdDay.id,
        title: extra.title,
        description: extra.description,
        type: extra.type,
        url: extra.url,
        content: extra.content ?? null,
        order: extra.order,
        publishedAt: item.publishedAt,
      })),
    ];

    await db.insert(resources).values(resourceValues);
    totalResources += resourceValues.length;

    if (item.miniProject) {
      await db.insert(miniProjects).values({
        dayId: createdDay.id,
        title: item.miniProject.title,
        summary: item.miniProject.summary,
        instructions: item.miniProject.instructions,
        milestones: item.miniProject.milestones,
        difficulty: item.miniProject.difficulty,
        estimatedMinutes: item.miniProject.estimatedMinutes,
        tags: item.miniProject.tags,
        dueDate: item.miniProject.dueDate,
        order: item.miniProject.order,
        publishedAt: item.publishedAt,
      });
      totalMiniProjects += 1;
    }
  }

  console.log(
    `Seed completed successfully: ${daySeeds.length} days, ${totalResources} resources, and ${totalMiniProjects} mini-projects.`
  );
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
