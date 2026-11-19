import type { MiniProjectMilestone, ProjectDifficulty } from "@repo/shared";

export interface DayMiniProjectDefaults {
  title: string;
  summary: string;
  milestones: MiniProjectMilestone[];
  difficulty: ProjectDifficulty;
  estimatedMinutes: number;
  tags: string[];
  dueDate: Date;
  order: number;
}

export interface DayScheduleEntry {
  dayNumber: number;
  title: string;
  date: Date;
  publishedAt: Date;
  summary: string;
  miniProject?: DayMiniProjectDefaults;
}

// Schedule: Mon–Fri for 2 weeks starting Monday, Nov 16, 2026, published at 9:00 AM UTC+1 (+01:00).
export const DAY_SCHEDULE: DayScheduleEntry[] = [
  {
    dayNumber: 1,
    title: "Programming Basics in JS & Intro to Node.js",
    date: new Date("2026-11-16T09:00:00+01:00"),
    publishedAt: new Date("2026-11-16T09:00:00+01:00"),
    summary:
      "How programs execute, variables, data types, conditionals, loops, functions, arrays & objects, and running JavaScript in Node.js (node, process.argv, node:fs/promises).",
    miniProject: {
      title: "JavaScript CLI Utility (todo-cli / log-summary)",
      summary:
        "Build a Node.js CLI app with process.argv and fs/promises to manage todos or summarize logs with clean functions and error handling.",
      milestones: [
        {
          id: "m1",
          title: "Parse CLI arguments",
          description: "Support add, list, done, and delete subcommands via process.argv.",
        },
        {
          id: "m2",
          title: "Persist state with fs/promises",
          description: "Read and write structured JSON data safely with error handling.",
        },
        {
          id: "m3",
          title: "Add filtering, summary & export",
          description: "Implement stats, tag filtering, and formatted CLI output.",
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
      "npm & package.json, ESM vs CommonJS, the Node.js event loop, Promises & async/await, resilient concurrency (Promise.allSettled), and streaming large files with node:stream/promises.",
    miniProject: {
      title: "Streaming CSV & Log Analyzer CLI",
      summary:
        "Process large log or CSV files line-by-line with Node streams, compute metrics, and output a JSON summary without exhausting memory.",
      milestones: [
        {
          id: "m1",
          title: "Accept file path & stream via pipeline",
          description: "Stream input line-by-line using fs.createReadStream and readline/pipeline.",
        },
        {
          id: "m2",
          title: "Compute & write summary stats",
          description: "Count lines, log levels, status codes, and top endpoints.",
        },
        {
          id: "m3",
          title: "Add redaction, gzip & batch mode",
          description: "Support transform streams, .gz inputs, and concurrent multi-file scans.",
        },
      ],
      difficulty: "BEGINNER",
      estimatedMinutes: 75,
      tags: ["Node.js", "Streams", "Async/Await", "ESM"],
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
      "Strict TypeScript (tsconfig, interfaces, unions, generics, type guards), building a typed JSON API with node:http, handling CORS, and connecting a Vite frontend.",
    miniProject: {
      title: "Strict TypeScript HTTP API + Frontend Integration",
      summary:
        "Build a typed node:http JSON API in strict TypeScript with CRUD routes and CORS, then connect it to a live Vite frontend.",
      milestones: [
        {
          id: "m1",
          title: "Set up strict TypeScript & tsx",
          description: "Configure tsconfig.json with strict mode and shared domain types.",
        },
        {
          id: "m2",
          title: "Build typed HTTP helpers & CORS",
          description: "Create typed body parsing, JSON responses, and CRUD endpoints.",
        },
        {
          id: "m3",
          title: "Connect to the Vite frontend",
          description: "Fetch, create, and update records live from the browser UI.",
        },
      ],
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 90,
      tags: ["TypeScript", "node:http", "CORS", "REST"],
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
      "Layered Express + TypeScript architecture (routes → controllers → services), middleware pipelines, Zod request validation, custom AppError handling, and structured pino logging.",
    miniProject: {
      title: "Typed Express + Zod REST API",
      summary:
        "Refactor into a layered Express + TypeScript API with Zod validation middleware, centralized AppError handling, and structured pino logging.",
      milestones: [
        {
          id: "m1",
          title: "Scaffold layered Express architecture",
          description: "Separate routers, controllers, services, and shared types.",
        },
        {
          id: "m2",
          title: "Implement Zod validate() middleware",
          description: "Validate body, params, and query with consistent 400 errors.",
        },
        {
          id: "m3",
          title: "Add AppError & pino logging",
          description: "Centralize error responses and structured request logs.",
        },
      ],
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 90,
      tags: ["Express", "TypeScript", "Zod", "Middleware"],
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
      "Relational modeling in PostgreSQL, Drizzle ORM schemas & migrations, parameterized queries, transactions, pagination/filtering, and Squad Sprint Kickoff.",
    miniProject: {
      title: "Postgres-Backed Data-Access Module",
      summary:
        "Replace in-memory storage with PostgreSQL + Drizzle ORM, including migrations, relational joins, transactions, and cursor/offset pagination.",
      milestones: [
        {
          id: "m1",
          title: "Run Postgres & define Drizzle schema",
          description: "Model normalized tables, foreign keys, and indexes.",
        },
        {
          id: "m2",
          title: "Run migrations & seed data",
          description: "Apply schema migrations cleanly and seed initial rows.",
        },
        {
          id: "m3",
          title: "Implement transactional repository queries",
          description: "Support filtered search, pagination, and atomic transactions.",
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
    miniProject: {
      title: "Auth & RBAC Middleware Sandbox",
      summary:
        "Implement secure password hashing, JWT authentication with typed req.user, role-based access control, and API security hardening.",
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
    miniProject: {
      title: "Vitest + Supertest Suite & OpenAPI Spec",
      summary:
        "Write an automated Vitest + Supertest integration test suite against PostgreSQL with mocked external dependencies, plus OpenAPI docs from Zod.",
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
    miniProject: {
      title: "WebSocket Notification Ticker & Cron Worker",
      summary:
        "Build a typed WebSocket broadcast server paired with resilient external API fetching and a node-cron background worker.",
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
  },
  {
    dayNumber: 10,
    title: "Docker, CI/CD, Cloud Deployment & Wrap-Up",
    date: new Date("2026-11-27T09:00:00+01:00"),
    publishedAt: new Date("2026-11-27T09:00:00+01:00"),
    summary:
      "Multi-stage Dockerfile for Node + TypeScript, GitHub Actions CI/CD pipelines, provisioning Neon PostgreSQL, deploying to Railway, live observability verification, and course wrap-up.",
  },
];

export function getDayScheduleEntry(dayNumber: number): DayScheduleEntry {
  const known = DAY_SCHEDULE.find((d) => d.dayNumber === dayNumber);
  if (known) return known;
  return {
    dayNumber,
    title: `Day ${dayNumber}`,
    date: new Date(),
    publishedAt: new Date(),
    summary: `Course materials for Day ${dayNumber}.`,
  };
}
