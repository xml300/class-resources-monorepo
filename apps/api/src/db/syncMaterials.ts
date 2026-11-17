import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import {
  days,
  resources,
  miniProjects,
  type projectDifficultyEnum,
} from "./schema.js";

export type ProjectDifficulty =
  (typeof projectDifficultyEnum.enumValues)[number];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveMaterialsDir(): string {
  const candidates = [
    path.join(__dirname, "materials"),
    path.resolve(__dirname, "../../src/db/materials"),
    path.resolve(process.cwd(), "src/db/materials"),
    path.resolve(process.cwd(), "apps/api/src/db/materials"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not locate materials directory. Checked: ${candidates.join(", ")}`
  );
}

function readMaterial(materialsDir: string, relPath: string): string {
  return fs.readFileSync(path.join(materialsDir, relPath), "utf8");
}

export interface ResourceSeed {
  title: string;
  description: string;
  type: "SLIDES" | "VIDEO" | "READING" | "CODE" | "ASSIGNMENT" | "OTHER";
  url: string;
  content?: string | null;
  order: number;
}

export interface DaySeed {
  dayNumber: number;
  title: string;
  date: Date;
  publishedAt: Date;
  summary: string;
  slidesTitle: string;
  slidesUrl: string;
  extraResources?: ResourceSeed[];
  miniProject?: {
    title: string;
    summary: string;
    instructions: string;
    milestones: Array<{ id: string; title: string; description: string }>;
    difficulty: ProjectDifficulty;
    estimatedMinutes: number;
    tags: string[];
    dueDate: Date;
    order: number;
  };
}

// Schedule: Mon–Fri for 2 weeks starting Monday, Nov 16, 2026, published at 9:00 AM UTC+1 (+01:00).
export function getDaySeeds(): DaySeed[] {
  const materialsDir = resolveMaterialsDir();
  const load = (relPath: string) => readMaterial(materialsDir, relPath);

  return [
    {
      dayNumber: 1,
      title: "Programming Basics in JS & Intro to Node.js",
      date: new Date("2026-11-16T09:00:00+01:00"),
      publishedAt: new Date("2026-11-16T09:00:00+01:00"),
      summary:
        "How programs execute, variables, data types, conditionals, loops, functions, arrays & objects, and running JavaScript in Node.js (node, process.argv, node:fs/promises).",
      slidesTitle: "Day 1: Programming Basics in JS & Intro to Node.js (Expanded)",
      slidesUrl:
        "https://docs.google.com/presentation/d/15l49rcEJFVVFyZcNFsdtUSxYn9Y9eIAEO4kvCTsx4HY",
      extraResources: [
        {
          title: "Day 1 Coding Exercises",
          description:
            "6 guided JavaScript & Node.js coding exercises covering conditionals, arrays, word frequency, CLI args, and fs/promises.",
          type: "ASSIGNMENT",
          url: "https://drive.google.com/file/d/17R-IzCqXVPKfEmD8JGrj5B6Aqx0ZnzbV/view",
          content: load("coding-exercises/day-01.md"),
          order: 2,
        },
        {
          title: "Cheat Sheet: Modern JavaScript & Node.js Essentials (Days 1–2)",
          description:
            "Quick reference for variables, array methods, ESM modules, async/await, and node:http.",
          type: "READING",
          url: "https://drive.google.com/file/d/1RT8YAhvLxhZ7EnvM4bfuZZRlX8p9Xcbl/view",
          content: load("cheat-sheets/01-javascript-and-nodejs.md"),
          order: 3,
        },
        {
          title: "Day 0 Pre-Class Setup Checklist",
          description:
            "Verify Node.js, Git, GitHub SSH/auth, VS Code extensions, and Docker before Day 1.",
          type: "READING",
          url: "https://drive.google.com/file/d/1eCcZhSeogSuTjRpaRFk11a9r0QiCpt3i/view",
          content: load("day0-setup-checklist.md"),
          order: 4,
        },
        {
          title: "10-Day Node.js Curriculum Plan",
          description:
            "Full 10-day course roadmap, daily rhythm, mini-project tiers, and squad project guide.",
          type: "READING",
          url: "https://drive.google.com/file/d/1zHuGF1YVt5qSX_-UJijFKHTFJE0i9DTj/view",
          content: load("nodejs-curriculum.md"),
          order: 5,
        },
        {
          title: "Mini-Projects & Exercises Handbook (Days 1–10)",
          description:
            "Complete handbook of all coding exercises, mini-projects, and workshops across the 10-day course.",
          type: "READING",
          url: "https://drive.google.com/file/d/1ttmbrebSoz_iguPvtbbxd_6lj0P5fQXK/view",
          content: load("mini-projects-and-exercises-handbook.md"),
          order: 6,
        },
      ],
      miniProject: {
        title: "JavaScript CLI Utility (todo-cli / log-summary)",
        summary:
          "Build a JavaScript CLI utility that parses command-line arguments and persists structured JSON data via node:fs/promises.",
        instructions: load("mini-projects/day-01.md"),
        milestones: [
          {
            id: "m1",
            title: "Parse CLI arguments",
            description: "Read subcommands and options from process.argv.",
          },
          {
            id: "m2",
            title: "Persist state with fs/promises",
            description: "Safely load and save records to data.json.",
          },
          {
            id: "m3",
            title: "Add filtering, summary & export",
            description: "Implement --pending/--done filters and CSV export.",
          },
        ],
        difficulty: "BEGINNER",
        estimatedMinutes: 60,
        tags: ["JavaScript", "Node.js", "CLI", "fs/promises"],
        dueDate: new Date("2026-11-16T23:59:00+01:00"),
        order: 1,
      },
    },
    {
      dayNumber: 2,
      title: "Node.js Ecosystem, Modules, Async JS & Streams",
      date: new Date("2026-11-17T09:00:00+01:00"),
      publishedAt: new Date("2026-11-17T09:00:00+01:00"),
      summary:
        "The 4 uses of Node.js, V8 & the Event Loop, npm & package.json, CommonJS vs. ESM, Promises & async/await, and Streams (createReadStream, Transform, pipeline).",
      slidesTitle: "Day 2: Node.js Ecosystem, Modules, Async JS & HTTP",
      slidesUrl:
        "https://docs.google.com/presentation/d/1BXpNTxzr5BGOe4hchc6G0NZPOWPx8D0KbABuQ2QkzZE",
      extraResources: [
        {
          title: "Day 2 Coding Exercises",
          description:
            "Async/await, Promise.all, ESM, streams, and CommonJS-to-ESM migration coding exercises.",
          type: "ASSIGNMENT",
          url: "https://drive.google.com/file/d/1-hlxfSvIqS202akXOfCuTAWqNC0ggzXr/view",
          content: load("coding-exercises/day-02.md"),
          order: 2,
        },
        {
          title: "All-in-One One-Page Cheat Sheets",
          description:
            "Consolidated reference sheets covering JavaScript, Node.js, TypeScript, Express, Drizzle, Testing, and Git.",
          type: "READING",
          url: "https://drive.google.com/file/d/1y6HvnONWw4MJBUE5xCKC1W3EU4lqbwHi/view",
          content: load("one-page-cheat-sheets.md"),
          order: 3,
        },
      ],
      miniProject: {
        title: "Streaming CSV & Log Analyzer CLI",
        summary:
          "Build a zero-dependency Node.js CLI tool using only built-in modules (node:fs, node:stream/promises, node:zlib) to stream and analyze log/CSV files.",
        instructions: load("mini-projects/day-02.md"),
        milestones: [
          {
            id: "m1",
            title: "Accept file path & stream via pipeline",
            description:
              "Read .log/.csv path from process.argv[2] and stream with createReadStream() + Transform.",
          },
          {
            id: "m2",
            title: "Compute & write summary stats",
            description:
              "Track total lines, error count, and warning count and write summary.json.",
          },
          {
            id: "m3",
            title: "Add redaction, gzip & batch mode",
            description:
              "Redact sensitive tokens, compress with node:zlib, and process directories concurrently.",
          },
        ],
        difficulty: "BEGINNER",
        estimatedMinutes: 75,
        tags: ["Node.js", "ESM", "Async/Await", "Streams", "node:zlib"],
        dueDate: new Date("2026-11-17T23:59:00+01:00"),
        order: 2,
      },
    },
    {
      dayNumber: 3,
      title: "TypeScript Foundations, node:http & Connecting to a Frontend",
      date: new Date("2026-11-18T09:00:00+01:00"),
      publishedAt: new Date("2026-11-18T09:00:00+01:00"),
      summary:
        "Day 1–2 deep-dive recap, TypeScript types, interfaces vs. type aliases, discriminated unions (Result<T, E>), tsconfig.json (NodeNext, strict: true), tsx vs. tsc, typed node:http, and CORS with a Vite frontend.",
      slidesTitle: "Day 3: TypeScript Foundations & Connecting to a Frontend",
      slidesUrl:
        "https://docs.google.com/presentation/d/1C7H3KKxn1XlDziwsCpXUKDBcakXJ8EDusomtDQn0pDg",
      extraResources: [
        {
          title: "Day 3 Recap: Day 1 & Day 2 Deep Dive",
          description:
            "Recap slides covering immutability, defensive file I/O, event loop microtasks, async/await pitfalls, Buffers, and Transform streams.",
          type: "SLIDES",
          url: "https://docs.google.com/presentation/d/15x1DDB0fVFv_UYAQ31kgpURaoX8iNWY7Rh8v8dABLVQ",
          order: 2,
        },
        {
          title: "Day 3 Recap: Day 1 & Day 2 Deep-Dive Exercises",
          description:
            "9 deep-dive exercises revisiting JS/Node.js immutability, ENOENT vs. SyntaxError, event loop ordering, Promise.race/allSettled, Buffers, and Transform streams.",
          type: "ASSIGNMENT",
          url: "https://drive.google.com/file/d/1dVjVer36mA7YD7EQ-sMtc8wwenS88hXO/view",
          content: load("coding-exercises/day-03-recap.md"),
          order: 3,
        },
        {
          title: "Day 3 Coding Exercises",
          description:
            "Type narrowing, discriminated unions, 2-route node:http server, typed parseJsonBody<T>, and CORS middleware exercises.",
          type: "ASSIGNMENT",
          url: "https://drive.google.com/file/d/1gisDtbg7mA8X--qwm_sXWgzROQv2Jrxr/view",
          content: load("coding-exercises/day-03.md"),
          order: 4,
        },
        {
          title: "Cheat Sheet: TypeScript Essentials (Day 3)",
          description:
            "Interfaces vs. type aliases, discriminated unions, generics, tsconfig.json, and tsx vs. tsc.",
          type: "READING",
          url: "https://drive.google.com/file/d/1OauZZZHqQQ1tdbDXr-R8vSH_xbmOKN8L/view",
          content: load("cheat-sheets/02-typescript.md"),
          order: 5,
        },
      ],
      miniProject: {
        title: "Strict TypeScript HTTP API + Frontend Integration",
        summary:
          "Build a strict TypeScript node:http API with typed request parsing and CORS headers, and connect it to the pre-built Vite frontend.",
        instructions: load("mini-projects/day-03.md"),
        milestones: [
          {
            id: "m1",
            title: "Set up strict TypeScript & tsx",
            description: "Configure tsconfig.json with strict mode and NodeNext.",
          },
          {
            id: "m2",
            title: "Build typed HTTP helpers & CORS",
            description: "Implement parseJsonBody<T> and CORS middleware.",
          },
          {
            id: "m3",
            title: "Connect to the Vite frontend",
            description: "Verify end-to-end requests from the browser UI.",
          },
        ],
        difficulty: "INTERMEDIATE",
        estimatedMinutes: 90,
        tags: ["TypeScript", "CORS", "Vite", "Strict Mode"],
        dueDate: new Date("2026-11-18T23:59:00+01:00"),
        order: 3,
      },
    },
    {
      dayNumber: 4,
      title: "Express.js + TypeScript Architecture",
      date: new Date("2026-11-19T09:00:00+01:00"),
      publishedAt: new Date("2026-11-19T09:00:00+01:00"),
      summary:
        "Typing Express (Request, Response, NextFunction), middleware pipelines, Zod validation & type inference, centralized error handling (AppError), pino logging, and layered architecture.",
      slidesTitle: "Day 4: Express.js + TypeScript Architecture",
      slidesUrl:
        "https://docs.google.com/presentation/d/1hzl9flcji8uZ5VaIiv5VnaRA3bJcF23ES9_ehYN7qtU",
      extraResources: [
        {
          title: "Day 4 Coding Exercises",
          description:
            "Zod validation middleware, AppError handler, pino logging, and layered Express exercises.",
          type: "ASSIGNMENT",
          url: "https://drive.google.com/file/d/1HAd6bIA_M4EMaP7pYiWw6AjgT7XjMm8r/view",
          content: load("coding-exercises/day-04.md"),
          order: 2,
        },
        {
          title: "Cheat Sheet: Express.js & Zod (Day 4)",
          description:
            "Typed Express routes, middleware pipeline, Zod schemas & z.infer, and centralized error handling.",
          type: "READING",
          url: "https://drive.google.com/file/d/12AlgtHJA7Lja52gKIGtKTirU1fkL3krp/view",
          content: load("cheat-sheets/03-express-and-zod.md"),
          order: 3,
        },
      ],
      miniProject: {
        title: "Typed Express + Zod REST API",
        summary:
          "Build a layered Express + TypeScript REST API (Bookmark Manager or Expense Tracker) with generic Zod validation and centralized error handling.",
        instructions: load("mini-projects/day-04.md"),
        milestones: [
          {
            id: "m1",
            title: "Scaffold layered Express architecture",
            description: "Separate routes, controllers, and service modules.",
          },
          {
            id: "m2",
            title: "Implement Zod validate() middleware",
            description: "Validate body, query, and params with inferred types.",
          },
          {
            id: "m3",
            title: "Add AppError & pino logging",
            description: "Centralize error responses and structured logs.",
          },
        ],
        difficulty: "INTERMEDIATE",
        estimatedMinutes: 90,
        tags: ["Express", "TypeScript", "Zod", "Pino", "REST"],
        dueDate: new Date("2026-11-19T23:59:00+01:00"),
        order: 4,
      },
    },
    {
      dayNumber: 5,
      title: "PostgreSQL & Type-Safe Data Access",
      date: new Date("2026-11-20T09:00:00+01:00"),
      publishedAt: new Date("2026-11-20T09:00:00+01:00"),
      summary:
        "Relational schema design, running PostgreSQL via docker-compose.yml, pg vs. Drizzle/Prisma ORMs, migrations, seeding, joins, pagination, transactions, and Squad Project Kickoff.",
      slidesTitle: "Day 5: PostgreSQL & Type-Safe Data Access",
      slidesUrl:
        "https://docs.google.com/presentation/d/1UcSv1QjC4fxhUi8ILrdgdpMTNOj_moDHqgrX2GM-_Ro",
      extraResources: [
        {
          title: "Day 5 Coding Exercises",
          description:
            "Drizzle schema, migrations, transactions, and PostgreSQL query exercises.",
          type: "ASSIGNMENT",
          url: "https://drive.google.com/file/d/1El0rJ5IcAvjS4qzjeS5RUUVMftMl3ONB/view",
          content: load("coding-exercises/day-05.md"),
          order: 2,
        },
        {
          title: "Cheat Sheet: PostgreSQL, Drizzle ORM & Auth (Days 5–6)",
          description:
            "Drizzle schema definitions, queries, db.transaction(), JWTs, and RBAC middleware patterns.",
          type: "READING",
          url: "https://drive.google.com/file/d/1V-oaXjkiltjBgPYftiXZ4dd10S9ynubl/view",
          content: load("cheat-sheets/04-postgres-drizzle-and-auth.md"),
          order: 3,
        },
        {
          title: "Cheat Sheet: Git & GitHub Team Workflow (Days 5–8)",
          description:
            "Feature branches, PR workflow, rebasing/merging main, and resolving merge conflicts cleanly.",
          type: "READING",
          url: "https://drive.google.com/file/d/1rtIoNlIC12XDg6jmFWfXHNZmjDm_-6Y5/view",
          content: load("cheat-sheets/06-git-and-github-workflow.md"),
          order: 4,
        },
        {
          title: "Collaborative Squad Project Ideas (Days 5–8)",
          description:
            "Squad project options and feature splits for the Days 5–8 collaborative backend sprint.",
          type: "READING",
          url: "https://drive.google.com/file/d/1drsP-0dEchexnhFC_RM9s0CYxZpeIpD9/view",
          content: load("collaborative-project-ideas.md"),
          order: 5,
        },
      ],
      miniProject: {
        title: "Postgres-Backed Data-Access Module",
        summary:
          "Design a relational PostgreSQL schema with Drizzle ORM, write migrations and a seed script, and implement transactional CRUD & pagination.",
        instructions: load("mini-projects/day-05.md"),
        milestones: [
          {
            id: "m1",
            title: "Run Postgres & define Drizzle schema",
            description: "Start PostgreSQL via Docker Compose and model relations.",
          },
          {
            id: "m2",
            title: "Run migrations & seed data",
            description: "Push schema changes and create a repeatable seed script.",
          },
          {
            id: "m3",
            title: "Implement transactional queries",
            description: "Use db.transaction() and paginated relational reads.",
          },
        ],
        difficulty: "INTERMEDIATE",
        estimatedMinutes: 90,
        tags: ["PostgreSQL", "Drizzle ORM", "Docker", "SQL", "Transactions"],
        dueDate: new Date("2026-11-20T23:59:00+01:00"),
        order: 5,
      },
    },
    {
      dayNumber: 6,
      title: "Authentication, Authorization & API Security",
      date: new Date("2026-11-23T09:00:00+01:00"),
      publishedAt: new Date("2026-11-23T09:00:00+01:00"),
      summary:
        "Password hashing (argon2/bcrypt), JWTs & typing req.user via Express declaration merging, RBAC middleware, helmet, CORS, rate limiting, SQL injection prevention, and Squad Sprint Day 2.",
      slidesTitle: "Day 6: Authentication, Authorization & API Security",
      slidesUrl:
        "https://docs.google.com/presentation/d/1ik59Yw038ghb2qh0DOYGveGXta2KYjJEbz-mLcGAg3Q",
      extraResources: [
        {
          title: "Day 6 Coding Exercises",
          description:
            "Password hashing, JWTs, Express req.user declaration merging, and RBAC exercises.",
          type: "ASSIGNMENT",
          url: "https://drive.google.com/file/d/1wN9XZAXNJsfHzYnmGju6r09cvCkhjkGS/view",
          content: load("coding-exercises/day-06.md"),
          order: 2,
        },
      ],
      miniProject: {
        title: "Auth & RBAC Middleware Sandbox",
        summary:
          "Implement secure password hashing, JWT authentication with typed req.user, role-based access control, and API security hardening.",
        instructions: load("mini-projects/day-06.md"),
        milestones: [
          {
            id: "m1",
            title: "Implement password & JWT helpers",
            description: "Hash/verify passwords and sign/verify JWT payloads.",
          },
          {
            id: "m2",
            title: "Add typed req.user & RBAC middleware",
            description: "Augment Express Request and enforce requireAuth/requireRole.",
          },
          {
            id: "m3",
            title: "Harden API security",
            description: "Enable helmet, CORS allowlists, and rate limiting.",
          },
        ],
        difficulty: "INTERMEDIATE",
        estimatedMinutes: 90,
        tags: ["Auth", "JWT", "RBAC", "Security", "Express"],
        dueDate: new Date("2026-11-23T23:59:00+01:00"),
        order: 6,
      },
    },
    {
      dayNumber: 7,
      title: "Testing TypeScript APIs & OpenAPI Docs",
      date: new Date("2026-11-24T09:00:00+01:00"),
      publishedAt: new Date("2026-11-24T09:00:00+01:00"),
      summary:
        "Vitest + Supertest integration testing against a test PostgreSQL database, mocking external services, generating OpenAPI/Swagger docs from Zod schemas, and Squad Sprint Day 3.",
      slidesTitle: "Day 7: Testing TypeScript APIs & OpenAPI Docs",
      slidesUrl:
        "https://docs.google.com/presentation/d/1kAgNRT_yKTO1p4CVrFLGceaZkZdd7wuKVewPTDva0aw",
      extraResources: [
        {
          title: "Day 7 Coding Exercises",
          description:
            "Vitest + Supertest integration specs, mocking external services, and OpenAPI docs exercises.",
          type: "ASSIGNMENT",
          url: "https://drive.google.com/file/d/1undsOdCZDNkB4uuzZpIhSk_c0ua3l-Yf/view",
          content: load("coding-exercises/day-07.md"),
          order: 2,
        },
        {
          title: "Cheat Sheet: Testing, WebSockets & Production (Days 7–9)",
          description:
            "Vitest + Supertest patterns, vi.mock, WebSocket broadcasts, /health checks, and graceful SIGTERM shutdown.",
          type: "READING",
          url: "https://drive.google.com/file/d/1I85THPFmPg2Z5pJFMZblwVV2U_Ne7cM9/view",
          content: load("cheat-sheets/05-testing-websockets-and-production.md"),
          order: 3,
        },
      ],
      miniProject: {
        title: "Vitest + Supertest Suite & OpenAPI Spec",
        summary:
          "Write an automated Vitest + Supertest integration test suite against PostgreSQL with mocked external dependencies, plus OpenAPI docs from Zod.",
        instructions: load("mini-projects/day-07.md"),
        milestones: [
          {
            id: "m1",
            title: "Configure Vitest & Supertest",
            description: "Set up test database helpers and app factory.",
          },
          {
            id: "m2",
            title: "Write CRUD, auth & mock tests",
            description: "Verify status codes, validation errors, and service mocks.",
          },
          {
            id: "m3",
            title: "Generate OpenAPI/Swagger docs",
            description: "Serve interactive API docs derived from Zod schemas.",
          },
        ],
        difficulty: "ADVANCED",
        estimatedMinutes: 90,
        tags: ["Vitest", "Supertest", "Testing", "OpenAPI", "Zod"],
        dueDate: new Date("2026-11-24T23:59:00+01:00"),
        order: 7,
      },
    },
    {
      dayNumber: 8,
      title: "Real-Time WebSockets, External APIs & Jobs",
      date: new Date("2026-11-25T09:00:00+01:00"),
      publishedAt: new Date("2026-11-25T09:00:00+01:00"),
      summary:
        "WebSockets (ws/socket.io) with shared TypeScript event types, resilient typed fetch calls (timeouts/retries), node-cron background jobs, multer file uploads, and Squad Final Sprint.",
      slidesTitle: "Day 8: Real-Time WebSockets, External APIs & Jobs",
      slidesUrl:
        "https://docs.google.com/presentation/d/1KUTsDUayAGFWO1V-GAzbxiO_PQ7Af4oMNxi-BFPt9I4",
      extraResources: [
        {
          title: "Day 8 Coding Exercises",
          description:
            "Typed WebSocket broadcasts, fetchJsonWithRetry<T>, and node-cron background job exercises.",
          type: "ASSIGNMENT",
          url: "https://drive.google.com/file/d/1QtRB8SqpQztSFYK4miE1FkDjcRJeHH9T/view",
          content: load("coding-exercises/day-08.md"),
          order: 2,
        },
      ],
      miniProject: {
        title: "WebSocket Notification Ticker & Cron Worker",
        summary:
          "Build a typed WebSocket broadcast server paired with resilient external API fetching and a node-cron background worker.",
        instructions: load("mini-projects/day-08.md"),
        milestones: [
          {
            id: "m1",
            title: "Build typed WebSocket broadcaster",
            description: "Share event types and push updates to connected clients.",
          },
          {
            id: "m2",
            title: "Implement fetchJsonWithRetry<T>",
            description: "Handle timeouts, HTTP errors, and retry backoff cleanly.",
          },
          {
            id: "m3",
            title: "Schedule node-cron background job",
            description: "Run periodic tasks and emit WebSocket notifications.",
          },
        ],
        difficulty: "ADVANCED",
        estimatedMinutes: 90,
        tags: ["WebSockets", "Cron", "Fetch", "TypeScript", "Multer"],
        dueDate: new Date("2026-11-25T23:59:00+01:00"),
        order: 8,
      },
    },
    {
      dayNumber: 9,
      title: "Production Readiness, Observability & Debugging",
      date: new Date("2026-11-26T09:00:00+01:00"),
      publishedAt: new Date("2026-11-26T09:00:00+01:00"),
      summary:
        "/health & readiness endpoints checking PostgreSQL connectivity, graceful SIGTERM/SIGINT shutdown, structured pino JSON logging & correlation IDs, memory & event-loop profiling, and full-stack debugging clinics.",
      slidesTitle: "Day 9: Production Readiness, Observability & Debugging",
      slidesUrl:
        "https://docs.google.com/presentation/d/12TA9WD7XVYLWZfvy5oR-aWlED6G0_HXOWZDDtqXTHj0",
      extraResources: [
        {
          title: "Day 9 Workshop: Observability & Debugging Clinics",
          description:
            "Readiness probes, graceful shutdown, correlation IDs, and Railway log/metrics troubleshooting.",
          type: "ASSIGNMENT",
          url: "https://drive.google.com/file/d/1ZOOthWEIyKbZ2PNo2nfGL2iFhodEX6fn/view",
          content: load("coding-exercises/day-09.md"),
          order: 2,
        },
      ],
    },
    {
      dayNumber: 10,
      title: "Docker, CI/CD, Cloud Deployment & Wrap-Up",
      date: new Date("2026-11-27T09:00:00+01:00"),
      publishedAt: new Date("2026-11-27T09:00:00+01:00"),
      summary:
        "Multi-stage Dockerfile for Node + TypeScript, GitHub Actions CI/CD pipelines, provisioning Neon PostgreSQL, deploying to Railway, live observability verification, and course wrap-up.",
      slidesTitle: "Day 10: Docker, CI/CD, Cloud Deployment & Wrap-Up",
      slidesUrl:
        "https://docs.google.com/presentation/d/1ntWnj9YInd2LYQrwI6nLy_30OAbtrDGHU7mdbPQXn0Q",
      extraResources: [
        {
          title: "Day 10 Workshop: Docker, CI/CD & Cloud Deployment",
          description:
            "Multi-stage Dockerfile, GitHub Actions CI, Neon PostgreSQL, and Railway deployment checklist.",
          type: "ASSIGNMENT",
          url: "https://drive.google.com/file/d/1Am4lMiLpDZEHlwCZ5H8b9-8zl9_QB_FB/view",
          content: load("coding-exercises/day-10.md"),
          order: 2,
        },
      ],
    },
  ];
}

export interface SyncMaterialsResult {
  daysCreated: number;
  daysUpdated: number;
  resourcesCreated: number;
  resourcesUpdated: number;
  miniProjectsCreated: number;
  miniProjectsUpdated: number;
}

function buildResourceSeeds(item: DaySeed): ResourceSeed[] {
  return [
    {
      title: item.slidesTitle,
      description: `Google Slides presentation for Day ${item.dayNumber}.`,
      type: "SLIDES",
      url: item.slidesUrl,
      content: null,
      order: 1,
    },
    ...(item.extraResources ?? []),
  ];
}

export async function syncSeedMaterials(): Promise<SyncMaterialsResult> {
  const daySeeds = getDaySeeds();
  const now = new Date();

  const summary: SyncMaterialsResult = {
    daysCreated: 0,
    daysUpdated: 0,
    resourcesCreated: 0,
    resourcesUpdated: 0,
    miniProjectsCreated: 0,
    miniProjectsUpdated: 0,
  };

  await db.transaction(async (tx) => {
    for (const item of daySeeds) {
      const existingDay = await tx.query.days.findFirst({
        where: eq(days.dayNumber, item.dayNumber),
      });

      let dayId: string;
      let dayPublishedAt: Date | null;

      if (existingDay) {
        await tx
          .update(days)
          .set({
            title: item.title,
            date: item.date,
            summary: item.summary,
            updatedAt: now,
          })
          .where(eq(days.id, existingDay.id));
        dayId = existingDay.id;
        dayPublishedAt = existingDay.publishedAt;
        summary.daysUpdated += 1;
      } else {
        const [createdDay] = await tx
          .insert(days)
          .values({
            dayNumber: item.dayNumber,
            title: item.title,
            date: item.date,
            summary: item.summary,
            publishedAt: item.publishedAt,
          })
          .returning();
        dayId = createdDay.id;
        dayPublishedAt = createdDay.publishedAt;
        summary.daysCreated += 1;
      }

      const existingResources = await tx.query.resources.findMany({
        where: eq(resources.dayId, dayId),
      });

      const matchedResourceIds = new Set<string>();
      const resourceSeeds = buildResourceSeeds(item);

      for (const resSeed of resourceSeeds) {
        const match =
          existingResources.find(
            (r) => !matchedResourceIds.has(r.id) && r.url === resSeed.url
          ) ??
          existingResources.find(
            (r) => !matchedResourceIds.has(r.id) && r.title === resSeed.title
          );

        if (match) {
          matchedResourceIds.add(match.id);
          await tx
            .update(resources)
            .set({
              title: resSeed.title,
              description: resSeed.description,
              type: resSeed.type,
              url: resSeed.url,
              content: resSeed.content ?? null,
              order: resSeed.order,
              updatedAt: now,
            })
            .where(eq(resources.id, match.id));
          summary.resourcesUpdated += 1;
        } else {
          await tx.insert(resources).values({
            dayId,
            title: resSeed.title,
            description: resSeed.description,
            type: resSeed.type,
            url: resSeed.url,
            content: resSeed.content ?? null,
            order: resSeed.order,
            publishedAt: dayPublishedAt ?? item.publishedAt,
          });
          summary.resourcesCreated += 1;
        }
      }

      if (item.miniProject) {
        const existingMp = await tx.query.miniProjects.findFirst({
          where: eq(miniProjects.dayId, dayId),
        });

        if (existingMp) {
          await tx
            .update(miniProjects)
            .set({
              title: item.miniProject.title,
              summary: item.miniProject.summary,
              instructions: item.miniProject.instructions,
              milestones: item.miniProject.milestones,
              difficulty: item.miniProject.difficulty,
              estimatedMinutes: item.miniProject.estimatedMinutes,
              tags: item.miniProject.tags,
              dueDate: item.miniProject.dueDate,
              order: item.miniProject.order,
              updatedAt: now,
            })
            .where(eq(miniProjects.id, existingMp.id));
          summary.miniProjectsUpdated += 1;
        } else {
          await tx.insert(miniProjects).values({
            dayId,
            title: item.miniProject.title,
            summary: item.miniProject.summary,
            instructions: item.miniProject.instructions,
            milestones: item.miniProject.milestones,
            difficulty: item.miniProject.difficulty,
            estimatedMinutes: item.miniProject.estimatedMinutes,
            tags: item.miniProject.tags,
            dueDate: item.miniProject.dueDate,
            order: item.miniProject.order,
            publishedAt: dayPublishedAt ?? item.publishedAt,
          });
          summary.miniProjectsCreated += 1;
        }
      }
    }
  });

  return summary;
}
