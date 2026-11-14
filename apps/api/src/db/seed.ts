import { count } from "drizzle-orm";
import { db, pool } from "./index.js";
import { days, resources } from "./schema.js";

async function seed() {
  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(days);

  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} day(s). Skipping seed.`);
    return;
  }

  console.log("Seeding initial class days and resources...");

  const [day1] = await db
    .insert(days)
    .values({
      dayNumber: 1,
      title: "Course Introduction & Environment Setup",
      date: new Date("2026-09-01T09:00:00Z"),
      summary:
        "Welcome to the course! Today we cover the syllabus, expectations, and setting up your local development environment.",
      isPublished: true,
    })
    .returning();

  const [day2] = await db
    .insert(days)
    .values({
      dayNumber: 2,
      title: "TypeScript & Modern Web Fundamentals",
      date: new Date("2026-09-03T09:00:00Z"),
      summary:
        "Deep dive into TypeScript types, async/await patterns, and structuring monorepo applications.",
      isPublished: true,
    })
    .returning();

  const [day3] = await db
    .insert(days)
    .values({
      dayNumber: 3,
      title: "REST APIs with Express & Drizzle ORM",
      date: new Date("2026-09-08T09:00:00Z"),
      summary:
        "Building type-safe backend services with Express, Zod validation, and PostgreSQL using Drizzle ORM.",
      isPublished: true,
    })
    .returning();

  await db.insert(resources).values([
    {
      dayId: day1.id,
      title: "Day 1 Lecture Slides: Course Overview",
      description: "Syllabus, grading breakdown, and semester roadmap.",
      type: "SLIDES",
      url: "https://docs.google.com/presentation/d/example-day-1",
      order: 1,
      isPublished: true,
    },
    {
      dayId: day1.id,
      title: "Setup Guide: Node.js, Git, and VS Code",
      description: "Step-by-step instructions to install required tools.",
      type: "READING",
      url: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs",
      order: 2,
      isPublished: true,
    },
    {
      dayId: day1.id,
      title: "Starter Repository",
      description: "Clone this repo to get started with the lab exercises.",
      type: "CODE",
      url: "https://github.com/example/class-starter",
      order: 3,
      isPublished: true,
    },
    {
      dayId: day2.id,
      title: "Day 2 Slides: TypeScript Essentials",
      description: "Interfaces, generics, unions, and type narrowing.",
      type: "SLIDES",
      url: "https://docs.google.com/presentation/d/example-day-2",
      order: 1,
      isPublished: true,
    },
    {
      dayId: day2.id,
      title: "Recorded Lecture: TypeScript in Practice",
      description: "60-minute walkthrough of real-world TypeScript patterns.",
      type: "VIDEO",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      order: 2,
      isPublished: true,
    },
    {
      dayId: day2.id,
      title: "Lab 1: Type-Safe Utilities",
      description: "Due before Day 3 class.",
      type: "ASSIGNMENT",
      url: "https://github.com/example/lab-1-typescript",
      order: 3,
      isPublished: true,
    },
    {
      dayId: day3.id,
      title: "Drizzle ORM PostgreSQL Documentation",
      description: "Reference guide for schemas, relations, and queries.",
      type: "READING",
      url: "https://orm.drizzle.team/docs/overview",
      order: 1,
      isPublished: true,
    },
    {
      dayId: day3.id,
      title: "Express + Drizzle Reference Code",
      description: "Complete example from today's live coding session.",
      type: "CODE",
      url: "https://github.com/example/express-drizzle-demo",
      order: 2,
      isPublished: true,
    },
  ]);

  console.log("Seed completed successfully.");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
