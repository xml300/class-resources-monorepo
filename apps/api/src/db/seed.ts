import { count } from "drizzle-orm";
import { db, pool } from "./index.js";
import { days, resources, miniProjects, type projectDifficultyEnum } from "./schema.js";

type ProjectDifficulty = (typeof projectDifficultyEnum.enumValues)[number];

interface DaySeed {
  dayNumber: number;
  title: string;
  date: Date;
  publishedAt: Date;
  summary: string;
  slidesTitle: string;
  slidesUrl: string;
  extraResources?: Array<{
    title: string;
    description: string;
    type: "SLIDES" | "VIDEO" | "READING" | "CODE" | "ASSIGNMENT" | "OTHER";
    url: string;
    order: number;
  }>;
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

// Schedule: Mon–Fri for 2 weeks starting Monday, Nov 16, 2026, published at 9:00 AM PST (-08:00).
const DAY_SEEDS: DaySeed[] = [
  {
    dayNumber: 1,
    title: "Programming Basics in JS & Intro to Node.js",
    date: new Date("2026-11-16T09:00:00-08:00"),
    publishedAt: new Date("2026-11-16T09:00:00-08:00"),
    summary:
      "How programs execute, variables, data types, conditionals, loops, functions, arrays & objects, and running JavaScript in Node.js (node, process.argv, node:fs/promises).",
    slidesTitle: "Day 1: Programming Basics in JS & Intro to Node.js (Expanded)",
    slidesUrl:
      "https://docs.google.com/presentation/d/15l49rcEJFVVFyZcNFsdtUSxYn9Y9eIAEO4kvCTsx4HY",
    extraResources: [
      {
        title: "10-Day Node.js Curriculum Plan (nodejs-curriculum.md)",
        description:
          "Full 10-day course roadmap, daily rhythm, mini-project tiers, and FlowBoard squad project guide.",
        type: "READING",
        url: "https://drive.google.com/file/d/1zHuGF1YVt5qSX_-UJijFKHTFJE0i9DTj/view",
        order: 2,
      },
    ],
    miniProject: {
      title: "JavaScript CLI Utility (todo-cli / log-summary)",
      summary:
        "Build a JavaScript CLI utility that parses command-line arguments and persists structured JSON data via node:fs/promises.",
      instructions: `## Objective
Create a command-line utility (\`todo-cli\` or \`log-summary\`) in plain JavaScript running on Node.js.

## Core Requirements
- Parse subcommands and flags from \`process.argv\`
- Read and write persistent data to \`data.json\` using \`node:fs/promises\`
- Handle missing files and invalid arguments gracefully

## Stretch & Challenge
- **Stretch:** Add filtering, summary counts, and formatted console tables
- **Challenge:** Support JSON/CSV export and unit tests with \`node:test\``,
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
          title: "Add summary & edge-case handling",
          description: "Validate inputs and format CLI output cleanly.",
        },
      ],
      difficulty: "BEGINNER",
      estimatedMinutes: 60,
      tags: ["JavaScript", "Node.js", "CLI", "fs/promises"],
      dueDate: new Date("2026-11-16T23:59:00-08:00"),
      order: 1,
    },
  },
  {
    dayNumber: 2,
    title: "Node.js Ecosystem, Modules, Async JS & HTTP",
    date: new Date("2026-11-17T09:00:00-08:00"),
    publishedAt: new Date("2026-11-17T09:00:00-08:00"),
    summary:
      "The 4 uses of Node.js, V8 & the Event Loop, npm & package.json, CommonJS vs. ESM, Promises & async/await, Streams, and node:http basics.",
    slidesTitle: "Day 2: Node.js Ecosystem, Modules, Async JS & HTTP",
    slidesUrl:
      "https://docs.google.com/presentation/d/1BXpNTxzr5BGOe4hchc6G0NZPOWPx8D0KbABuQ2QkzZE",
    miniProject: {
      title: "Zero-Dependency Node.js HTTP API",
      summary:
        "Build an ESM-based HTTP JSON API (or streaming CSV processor) using only built-in Node.js modules and async/await.",
      instructions: `## Objective
Build a zero-dependency HTTP JSON API using \`node:http\`, ESM (\`"type": "module"\`), and \`async/await\`.

## Core Requirements
- Implement CRUD routes with proper HTTP methods and status codes
- Parse incoming JSON request bodies asynchronously
- Persist data to disk without blocking the event loop

## Stretch & Challenge
- **Stretch:** Add query-parameter filtering and \`stream/promises\` \`pipeline\` export
- **Challenge:** Add request logging and concurrent file-lock protection`,
      milestones: [
        {
          id: "m1",
          title: "Configure ESM & node:http server",
          description: "Set up package.json with type: module and route requests.",
        },
        {
          id: "m2",
          title: "Implement async JSON body parsing",
          description: "Read request streams and return structured JSON responses.",
        },
        {
          id: "m3",
          title: "Add async persistence & error handling",
          description: "Store records asynchronously and handle 400/404 responses.",
        },
      ],
      difficulty: "BEGINNER",
      estimatedMinutes: 75,
      tags: ["Node.js", "ESM", "Async/Await", "node:http", "Streams"],
      dueDate: new Date("2026-11-17T23:59:00-08:00"),
      order: 2,
    },
  },
  {
    dayNumber: 3,
    title: "TypeScript Foundations & Connecting to a Frontend",
    date: new Date("2026-11-18T09:00:00-08:00"),
    publishedAt: new Date("2026-11-18T09:00:00-08:00"),
    summary:
      "TypeScript types, interfaces vs. type aliases, discriminated unions (Result<T, E>), tsconfig.json (NodeNext, strict: true), tsx vs. tsc, typed node:http, and CORS with a Vite frontend.",
    slidesTitle: "Day 3: TypeScript Foundations & Connecting to a Frontend",
    slidesUrl:
      "https://docs.google.com/presentation/d/1C7H3KKxn1XlDziwsCpXUKDBcakXJ8EDusomtDQn0pDg",
    miniProject: {
      title: "Strict TypeScript HTTP API + Frontend Integration",
      summary:
        "Build a strict TypeScript node:http API with typed request parsing and CORS headers, and connect it to the pre-built Vite frontend.",
      instructions: `## Objective
Migrate to strict TypeScript (\`strict: true\`, \`NodeNext\`) and connect your API to a Vite frontend.

## Core Requirements
- Configure \`tsconfig.json\`, \`tsx\` for dev, and \`tsc --noEmit\` for typechecking
- Implement a generic \`parseJsonBody<T>(req)\` helper and \`Result<T, E>\` discriminated union
- Enable CORS headers so the pre-built Vite app can fetch and mutate data

## Stretch & Challenge
- **Stretch:** Share request/response DTO types cleanly across endpoints
- **Challenge:** Add typed environment config and strict \`noUncheckedIndexedAccess\``,
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
      dueDate: new Date("2026-11-18T23:59:00-08:00"),
      order: 3,
    },
  },
  {
    dayNumber: 4,
    title: "Express.js + TypeScript Architecture",
    date: new Date("2026-11-19T09:00:00-08:00"),
    publishedAt: new Date("2026-11-19T09:00:00-08:00"),
    summary:
      "Typing Express (Request, Response, NextFunction), middleware pipelines, Zod validation & type inference, centralized error handling (AppError), pino logging, and layered architecture.",
    slidesTitle: "Day 4: Express.js + TypeScript Architecture",
    slidesUrl:
      "https://docs.google.com/presentation/d/1hzl9flcji8uZ5VaIiv5VnaRA3bJcF23ES9_ehYN7qtU",
    miniProject: {
      title: "Typed Express + Zod REST API",
      summary:
        "Build a layered Express + TypeScript REST API (Bookmark Manager or Expense Tracker) with generic Zod validation and centralized error handling.",
      instructions: `## Objective
Structure a production-style Express + TypeScript API using \`routes -> controllers -> services\`.

## Core Requirements
- Build a generic \`validate({ body, query, params })\` middleware using **Zod**
- Infer TypeScript types directly with \`z.infer\`
- Implement \`AppError\` and centralized error-handling middleware
- Add structured request logging with \`pino\`

## Stretch & Challenge
- **Stretch:** Add pagination, sorting, and search query validation
- **Challenge:** Add response DTO serialization and custom Zod refinements`,
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
      dueDate: new Date("2026-11-19T23:59:00-08:00"),
      order: 4,
    },
  },
  {
    dayNumber: 5,
    title: "PostgreSQL & Type-Safe Data Access",
    date: new Date("2026-11-20T09:00:00-08:00"),
    publishedAt: new Date("2026-11-20T09:00:00-08:00"),
    summary:
      "Relational schema design, running PostgreSQL via docker-compose.yml, pg vs. Drizzle/Prisma ORMs, migrations, seeding, joins, pagination, transactions, and FlowBoard Sprint Day 1.",
    slidesTitle: "Day 5: PostgreSQL & Type-Safe Data Access",
    slidesUrl:
      "https://docs.google.com/presentation/d/1UcSv1QjC4fxhUi8ILrdgdpMTNOj_moDHqgrX2GM-_Ro",
    miniProject: {
      title: "Postgres-Backed Data-Access Module",
      summary:
        "Design a relational PostgreSQL schema with Drizzle ORM, write migrations and a seed script, and implement transactional CRUD & pagination.",
      instructions: `## Objective
Build a standalone PostgreSQL data-access module backed by Docker Compose and Drizzle ORM.

## Core Requirements
- Model relational tables with foreign keys and timestamps
- Generate and run migrations plus an idempotent seed script
- Implement joins, pagination, and atomic \`db.transaction()\` operations

## Stretch & Challenge
- **Stretch:** Add full-text or \`ILIKE\` search with tag filtering
- **Challenge:** Add optimistic concurrency checks and cursor pagination`,
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
      dueDate: new Date("2026-11-20T23:59:00-08:00"),
      order: 5,
    },
  },
  {
    dayNumber: 6,
    title: "Authentication, Authorization & API Security",
    date: new Date("2026-11-23T09:00:00-08:00"),
    publishedAt: new Date("2026-11-23T09:00:00-08:00"),
    summary:
      "Password hashing (argon2/bcrypt), JWTs & typing req.user via Express declaration merging, RBAC middleware, helmet, CORS, rate limiting, SQL injection prevention, and FlowBoard Sprint Day 2.",
    slidesTitle: "Day 6: Authentication, Authorization & API Security",
    slidesUrl:
      "https://docs.google.com/presentation/d/1ik59Yw038ghb2qh0DOYGveGXta2KYjJEbz-mLcGAg3Q",
    miniProject: {
      title: "Auth & RBAC Middleware Sandbox",
      summary:
        "Implement secure password hashing, JWT authentication with typed req.user, role-based access control, and API security hardening.",
      instructions: `## Objective
Build a secure authentication and authorization sandbox in Express + TypeScript.

## Core Requirements
- Hash passwords with \`argon2\` or \`bcrypt\` and issue signed JWTs
- Extend Express \`Request\` via TypeScript declaration merging for \`req.user\`
- Implement \`requireAuth\` and \`requireRole\` RBAC middleware
- Configure \`helmet\`, strict CORS, and rate limiting

## Stretch & Challenge
- **Stretch:** Add HTTP-only refresh cookies and token revocation
- **Challenge:** Add per-IP/account brute-force lockout protection`,
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
      dueDate: new Date("2026-11-23T23:59:00-08:00"),
      order: 6,
    },
  },
  {
    dayNumber: 7,
    title: "Testing TypeScript APIs & OpenAPI Docs",
    date: new Date("2026-11-24T09:00:00-08:00"),
    publishedAt: new Date("2026-11-24T09:00:00-08:00"),
    summary:
      "Vitest + Supertest integration testing against a test PostgreSQL database, mocking external services, generating OpenAPI/Swagger docs from Zod schemas, and FlowBoard Sprint Day 3.",
    slidesTitle: "Day 7: Testing TypeScript APIs & OpenAPI Docs",
    slidesUrl:
      "https://docs.google.com/presentation/d/1kAgNRT_yKTO1p4CVrFLGceaZkZdd7wuKVewPTDva0aw",
    miniProject: {
      title: "Vitest + Supertest Suite & OpenAPI Spec",
      summary:
        "Write an automated Vitest + Supertest integration test suite against PostgreSQL with mocked external dependencies, plus OpenAPI docs from Zod.",
      instructions: `## Objective
Test an Express + PostgreSQL API end-to-end with Vitest + Supertest and document it with OpenAPI.

## Core Requirements
- Write integration tests covering happy paths, Zod 400 errors, auth 401/403, and 404s
- Mock an external service (e.g. \`MailerService\`) in tests
- Generate an OpenAPI 3.x / Swagger spec directly from Zod schemas

## Stretch & Challenge
- **Stretch:** Isolate test cases with database cleanup/transactions per test
- **Challenge:** Enforce minimum coverage thresholds in CI`,
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
      dueDate: new Date("2026-11-24T23:59:00-08:00"),
      order: 7,
    },
  },
  {
    dayNumber: 8,
    title: "Real-Time WebSockets, External APIs & Jobs",
    date: new Date("2026-11-25T09:00:00-08:00"),
    publishedAt: new Date("2026-11-25T09:00:00-08:00"),
    summary:
      "WebSockets (ws/socket.io) with shared TypeScript event types, resilient typed fetch calls (timeouts/retries), node-cron background jobs, multer file uploads, and FlowBoard Final Sprint.",
    slidesTitle: "Day 8: Real-Time WebSockets, External APIs & Jobs",
    slidesUrl:
      "https://docs.google.com/presentation/d/1KUTsDUayAGFWO1V-GAzbxiO_PQ7Af4oMNxi-BFPt9I4",
    miniProject: {
      title: "WebSocket Notification Ticker & Cron Worker",
      summary:
        "Build a typed WebSocket broadcast server paired with resilient external API fetching and a node-cron background worker.",
      instructions: `## Objective
Combine real-time WebSockets, resilient third-party \`fetch\`, and scheduled background jobs.

## Core Requirements
- Implement typed WebSocket events shared between server and client
- Build a \`fetchJsonWithRetry<T>\` helper with timeouts and exponential backoff
- Schedule a \`node-cron\` worker that broadcasts real-time updates

## Stretch & Challenge
- **Stretch:** Add room/channel subscriptions and \`multer\` attachment uploads
- **Challenge:** Persist job execution history and dead-letter failures to Postgres`,
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
      dueDate: new Date("2026-11-25T23:59:00-08:00"),
      order: 8,
    },
  },
  {
    dayNumber: 9,
    title: "Production Readiness, Observability & Debugging",
    date: new Date("2026-11-26T09:00:00-08:00"),
    publishedAt: new Date("2026-11-26T09:00:00-08:00"),
    summary:
      "/health & readiness endpoints checking PostgreSQL connectivity, graceful SIGTERM/SIGINT shutdown, structured pino JSON logging & correlation IDs, memory & event-loop profiling, and full-stack debugging clinics.",
    slidesTitle: "Day 9: Production Readiness, Observability & Debugging",
    slidesUrl:
      "https://docs.google.com/presentation/d/12TA9WD7XVYLWZfvy5oR-aWlED6G0_HXOWZDDtqXTHj0",
  },
  {
    dayNumber: 10,
    title: "Docker, CI/CD, Cloud Deployment & Wrap-Up",
    date: new Date("2026-11-27T09:00:00-08:00"),
    publishedAt: new Date("2026-11-27T09:00:00-08:00"),
    summary:
      "Multi-stage Dockerfile for Node + TypeScript, GitHub Actions CI/CD pipelines, provisioning Neon PostgreSQL, deploying to Railway, live observability verification, and course wrap-up.",
    slidesTitle: "Day 10: Docker, CI/CD, Cloud Deployment & Wrap-Up",
    slidesUrl:
      "https://docs.google.com/presentation/d/1ntWnj9YInd2LYQrwI6nLy_30OAbtrDGHU7mdbPQXn0Q",
  },
];

async function seed() {
  const force =
    process.argv.includes("--force") || process.env.FORCE_SEED === "true";

  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(days);

  if (existingCount > 0 && !force) {
    console.log(
      `Database already has ${existingCount} day(s). Pass --force to replace existing data.`
    );
    return;
  }

  if (existingCount > 0 && force) {
    console.log("Clearing existing days, resources, and mini-projects...");
    await db.delete(miniProjects);
    await db.delete(resources);
    await db.delete(days);
  }

  console.log("Seeding Days 1–10 (Mon–Fri, Nov 16–27, 2026 @ 9:00 AM PST)...");

  for (const item of DAY_SEEDS) {
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
        order: 1,
        publishedAt: item.publishedAt,
      },
      ...(item.extraResources ?? []).map((extra) => ({
        dayId: createdDay.id,
        title: extra.title,
        description: extra.description,
        type: extra.type,
        url: extra.url,
        order: extra.order,
        publishedAt: item.publishedAt,
      })),
    ];

    await db.insert(resources).values(resourceValues);

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
    }
  }

  console.log(
    "Seed completed successfully: 10 days, 11 resources, and 8 mini-projects."
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
