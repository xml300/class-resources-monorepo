import { count } from "drizzle-orm";
import { db, pool } from "./index.js";
import { days, resources, miniProjects } from "./schema.js";

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
      publishedAt: new Date("2026-09-01T09:00:00Z"),
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
      publishedAt: new Date("2026-09-01T09:00:00Z"),
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
      publishedAt: new Date("2026-09-01T09:00:00Z"),
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
      publishedAt: new Date("2026-09-01T09:00:00Z"),
    },
    {
      dayId: day1.id,
      title: "Setup Guide: Node.js, Git, and VS Code",
      description: "Step-by-step instructions to install required tools.",
      type: "READING",
      url: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs",
      order: 2,
      publishedAt: new Date("2026-09-01T09:00:00Z"),
    },
    {
      dayId: day1.id,
      title: "Starter Repository",
      description: "Clone this repo to get started with the lab exercises.",
      type: "CODE",
      url: "https://github.com/example/class-starter",
      order: 3,
      publishedAt: new Date("2026-09-01T09:00:00Z"),
    },
    {
      dayId: day2.id,
      title: "Day 2 Slides: TypeScript Essentials",
      description: "Interfaces, generics, unions, and type narrowing.",
      type: "SLIDES",
      url: "https://docs.google.com/presentation/d/example-day-2",
      order: 1,
      publishedAt: new Date("2026-09-01T09:00:00Z"),
    },
    {
      dayId: day2.id,
      title: "Recorded Lecture: TypeScript in Practice",
      description: "60-minute walkthrough of real-world TypeScript patterns.",
      type: "VIDEO",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      order: 2,
      publishedAt: new Date("2026-09-01T09:00:00Z"),
    },
    {
      dayId: day2.id,
      title: "Lab 1: Type-Safe Utilities",
      description: "Due before Day 3 class.",
      type: "ASSIGNMENT",
      url: "https://github.com/example/lab-1-typescript",
      order: 3,
      publishedAt: new Date("2026-09-01T09:00:00Z"),
    },
    {
      dayId: day3.id,
      title: "Drizzle ORM PostgreSQL Documentation",
      description: "Reference guide for schemas, relations, and queries.",
      type: "READING",
      url: "https://orm.drizzle.team/docs/overview",
      order: 1,
      publishedAt: new Date("2026-09-01T09:00:00Z"),
    },
    {
      dayId: day3.id,
      title: "Express + Drizzle Reference Code",
      description: "Complete example from today's live coding session.",
      type: "CODE",
      url: "https://github.com/example/express-drizzle-demo",
      order: 2,
      publishedAt: new Date("2026-09-01T09:00:00Z"),
    },
  ]);

  await db.insert(miniProjects).values([
    {
      dayId: day2.id,
      title: "CLI Task Tracker in TypeScript",
      summary:
        "Build a type-safe command-line task manager with JSON persistence, strict Zod validation, and filtered views.",
      instructions: `## Objective
Create a clean, type-safe CLI task tracker using TypeScript and Node.js.

## Requirements
- Parse subcommands (\`add\`, \`list\`, \`done\`, \`remove\`)
- Validate all user input with **Zod**
- Persist tasks to a local \`tasks.json\` file
- Support filtering by status (\`--pending\`, \`--completed\`)

## Stretch Goals
- Add priority levels and due-date sorting
- Write unit tests for your storage layer`,
      milestones: [
        {
          id: "m1",
          title: "Initialize TypeScript project & Zod schemas",
          description: "Define Task interface and input validation schemas.",
        },
        {
          id: "m2",
          title: "Implement JSON file storage",
          description: "Safely read and write tasks with atomic fallback.",
        },
        {
          id: "m3",
          title: "Build CLI commands & formatting",
          description: "Add list, add, complete, and delete commands.",
        },
      ],
      starterRepoUrl: "https://github.com/example/mini-project-cli-tasks",
      demoUrl: "https://example.com/demos/cli-tasks",
      specUrl: "https://docs.google.com/document/d/example-cli-spec",
      difficulty: "BEGINNER",
      estimatedMinutes: 60,
      tags: ["TypeScript", "Node.js", "Zod", "CLI"],
      dueDate: new Date("2026-09-10T23:59:00Z"),
      order: 1,
      publishedAt: new Date("2026-09-03T09:00:00Z"),
    },
    {
      dayId: day3.id,
      title: "Bookmarks REST API with Drizzle",
      summary:
        "Design and implement a RESTful bookmarks service with tags, search, and PostgreSQL persistence via Drizzle ORM.",
      instructions: `## Objective
Build a production-style REST API for saving and tagging web bookmarks.

## Endpoints to Implement
- \`GET /bookmarks?tag=react&q=hooks\`
- \`POST /bookmarks\`
- \`PATCH /bookmarks/:id\`
- \`DELETE /bookmarks/:id\`

## Tips
Use Drizzle's relational queries and return proper HTTP status codes (\`201\`, \`400\`, \`404\`).`,
      milestones: [
        {
          id: "m1",
          title: "Design Drizzle schema",
          description: "Create bookmarks table with tags and timestamps.",
        },
        {
          id: "m2",
          title: "Implement CRUD routes with Zod",
          description: "Validate request bodies and handle 404s cleanly.",
        },
        {
          id: "m3",
          title: "Add search & tag filtering",
          description: "Support query parameters for filtering results.",
        },
      ],
      starterRepoUrl: "https://github.com/example/mini-project-bookmarks-api",
      specUrl: "https://docs.google.com/document/d/example-bookmarks-spec",
      solutionUrl: "https://github.com/example/mini-project-bookmarks-solution",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 90,
      tags: ["Express", "Drizzle ORM", "PostgreSQL", "REST"],
      dueDate: new Date("2026-09-15T23:59:00Z"),
      order: 2,
      publishedAt: new Date("2026-09-08T09:00:00Z"),
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
