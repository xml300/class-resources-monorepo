import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findMaterialsDir(): string | null {
  const candidates = [
    path.resolve(__dirname, "../db/materials"),
    path.resolve(__dirname, "../../src/db/materials"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  return null;
}

const RESOURCE_MATERIAL_PATHS: Record<string, string> = {
  "Day 1 Coding Exercises": "coding-exercises/day-01.md",
  "Day 2 Coding Exercises": "coding-exercises/day-02.md",
  "Day 3 Coding Exercises": "coding-exercises/day-03.md",
  "Day 4 Coding Exercises": "coding-exercises/day-04.md",
  "Day 5 Coding Exercises": "coding-exercises/day-05.md",
  "Day 6 Coding Exercises": "coding-exercises/day-06.md",
  "Day 7 Coding Exercises": "coding-exercises/day-07.md",
  "Day 8 Coding Exercises": "coding-exercises/day-08.md",
  "Day 9 Workshop: Observability & Debugging Clinics":
    "coding-exercises/day-09.md",
  "Day 10 Workshop: Docker, CI/CD & Cloud Deployment":
    "coding-exercises/day-10.md",
  "Cheat Sheet: Modern JavaScript & Node.js Essentials (Days 1–2)":
    "cheat-sheets/01-javascript-and-nodejs.md",
  "Cheat Sheet: TypeScript Essentials (Day 3)":
    "cheat-sheets/02-typescript.md",
  "Cheat Sheet: Express.js & Zod (Day 4)":
    "cheat-sheets/03-express-and-zod.md",
  "Cheat Sheet: PostgreSQL, Drizzle ORM & Auth (Days 5–6)":
    "cheat-sheets/04-postgres-drizzle-and-auth.md",
  "Cheat Sheet: Testing, WebSockets & Production (Days 7–9)":
    "cheat-sheets/05-testing-websockets-and-production.md",
  "Cheat Sheet: Git & GitHub Team Workflow (Days 5–8)":
    "cheat-sheets/06-git-and-github-workflow.md",
  "Day 0 Pre-Class Setup Checklist": "day0-setup-checklist.md",
  "10-Day Node.js Curriculum Plan": "nodejs-curriculum.md",
  "Mini-Projects & Exercises Handbook (Days 1–10)":
    "mini-projects-and-exercises-handbook.md",
  "All-in-One One-Page Cheat Sheets": "one-page-cheat-sheets.md",
  "Collaborative Squad Project Ideas (Days 5–8)":
    "collaborative-project-ideas.md",
};

const MINI_PROJECT_MATERIAL_PATHS: Record<string, string> = {
  "JavaScript CLI Utility (todo-cli / log-summary)":
    "mini-projects/day-01.md",
  "Zero-Dependency Node.js HTTP API": "mini-projects/day-02.md",
  "Strict TypeScript HTTP API + Frontend Integration":
    "mini-projects/day-03.md",
  "Typed Express + Zod REST API": "mini-projects/day-04.md",
  "Postgres-Backed Data-Access Module": "mini-projects/day-05.md",
  "Auth & RBAC Middleware Sandbox": "mini-projects/day-06.md",
  "Vitest + Supertest Suite & OpenAPI Spec": "mini-projects/day-07.md",
  "WebSocket Notification Ticker & Cron Worker": "mini-projects/day-08.md",
};

function readIfNewerOnDisk(
  relPath: string | undefined,
  fallback: string | null,
  dbUpdatedAt?: Date | string | null
): string | null {
  if (!relPath) return fallback;
  const materialsDir = findMaterialsDir();
  if (!materialsDir) return fallback;

  const fullPath = path.join(materialsDir, relPath);
  try {
    const stat = fs.statSync(fullPath);
    const updatedMs = dbUpdatedAt ? new Date(dbUpdatedAt).getTime() : 0;
    if (!fallback || stat.mtimeMs > updatedMs) {
      return fs.readFileSync(fullPath, "utf8");
    }
  } catch {
    // Fall back to DB content if file is missing or unreadable
  }
  return fallback;
}

export function resolveResourceContent(resource: {
  title: string;
  content: string | null;
  updatedAt?: Date | string | null;
}): string | null {
  return readIfNewerOnDisk(
    RESOURCE_MATERIAL_PATHS[resource.title],
    resource.content,
    resource.updatedAt
  );
}

export function resolveMiniProjectInstructions(project: {
  title: string;
  instructions: string | null;
  updatedAt?: Date | string | null;
}): string | null {
  return readIfNewerOnDisk(
    MINI_PROJECT_MATERIAL_PATHS[project.title],
    project.instructions,
    project.updatedAt
  );
}
