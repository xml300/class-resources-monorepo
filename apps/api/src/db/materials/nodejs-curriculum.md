# 10-Day Node.js Curriculum Plan

**Schedule:** 10 Days, 9:00 AM – 4:00 PM (~60 instructional hours)  
**Core Stack:** JavaScript (Days 1–2), TypeScript (Days 3–10), Node.js, Express.js, PostgreSQL (Drizzle or Prisma), Vitest + Supertest, Docker  
**Format:** ~35% lecture / live coding, ~65% guided coding exercises, daily mini-projects (Days 1–8), class-wide project sprints (Days 5–8), and production workshops (Days 9–10)

---

## 1. Daily Rhythm (9:00 AM – 4:00 PM)

| Time | Activity |
| :--- | :--- |
| **9:00 – 9:15** | Morning warm-up (predict the output or debug a short snippet) |
| **9:15 – 10:30** | Core concept + live coding |
| **10:30 – 10:45** | Break |
| **10:45 – 12:00** | Guided coding exercises |
| **12:00 – 1:00** | Lunch |
| **1:00 – 2:30** | Afternoon deep-dive + daily mini-project (Days 1–8) / guided workshop (Days 9–10) |
| **2:30 – 2:45** | Break |
| **2:45 – 3:45** | Mini-project stretch goals (Days 1–4), FlowBoard squad sprint (Days 5–8), or review & clinics (Days 9–10) |
| **3:45 – 4:00** | Recap, Q&A, and preview of the next day |

---

## 2. Ecosystem Framing: "The 4 Ways Node.js Is Used"

Introduced on Day 2 so students understand Node.js as a general-purpose runtime—not *only* a REST API server:

1. **Frontend Tooling & Build Systems:** Node powers the tools that build frontend apps (Vite, Next.js, Tailwind, ESLint, Prettier, `npm`/`pnpm`).
2. **Full-Stack & Server-Side Rendering (SSR):** Frameworks like Next.js, Remix, and Astro run Node on the server to render HTML and act as a **Backend-for-Frontend (BFF)**.
3. **Backend APIs & Real-Time Services:** Express/Fastify APIs, microservices, WebSocket servers, and background workers.
4. **CLIs, Automation & Desktop:** Developer CLIs, CI scripts, web scrapers, and desktop apps (Electron / VS Code).

---

## 3. 10-Day Curriculum Breakdown

### Phase 1: Programming Foundations, Node.js, TypeScript & Express (Days 1–4)

* **Day 1: Programming Basics in JavaScript & Intro to Node.js**
  * **Topics:** How programs execute (input → logic → output), variables (`const`/`let`) & data types, conditionals (`if`/`else`, `===`, `&&`/`||`), loops (`for`, `for...of`), functions (parameters, return values, arrow functions), arrays & objects, and running JS in Node.js (`node`, `process.argv`, `node:fs/promises`).
  * **Coding Exercises:** Logic & loops drills, array/object processor, and a first Node.js file-reading script.
  * **Mini-Project:** Build a JavaScript CLI utility (`todo-cli` or `log-summary`) that persists data to `data.json` via `fs/promises`, with **Core**, **Stretch**, and **Challenge** tiers.

* **Day 2: Node.js Ecosystem, Modules, Async JS & HTTP Fundamentals**
  * **Topics:** The 4 uses of Node.js, V8 & the Event Loop (blocking vs. non-blocking I/O), `npm` & `package.json`, CommonJS (`require`) vs. ESM (`import`/`export`, `"type": "module"`), Promises & `async/await`, Streams (`stream/promises` `pipeline`), and `node:http` basics.
  * **Coding Exercises:** Convert sync/callback code to `async/await` + `Promise.all`; build a 2-route `node:http` JSON server.
  * **Mini-Project:** Build a zero-dependency Node.js HTTP API (or streaming CSV processor) with **Core**, **Stretch**, and **Challenge** tiers.

* **Day 3: TypeScript Foundations & Connecting Node to a Frontend**
  * **Topics:** Why TypeScript, primitive/object/array types, `interface` vs. `type`, union types & discriminated unions (`Result<T, E>`), `tsconfig.json` (`NodeNext`, `strict: true`), `tsx` (dev) vs. `tsc` (`--noEmit` & build), typed `node:http`, and CORS with a pre-built Vite/HTML frontend.
  * **Coding Exercises:** Migrate a JS utility to strict TypeScript; build a typed `parseJsonBody<T>(req)` helper and CORS middleware.
  * **Mini-Project:** Build a strict TypeScript HTTP API and connect it to the pre-built `day03-frontend/` Vite app with **Core**, **Stretch**, and **Challenge** tiers.

* **Day 4: Express.js + TypeScript Architecture**
  * **Topics:** Typing Express (`Request`, `Response`, `NextFunction`), middleware pipeline, Zod for runtime validation + static TS type inference (`z.infer`), centralized error-handling middleware (`AppError`), `pino` logging, layered architecture (`routes → controllers → services`).
  * **Coding Exercises:** Build a generic `validate({ body, query, params })` Zod middleware + centralized `errorHandler`.
  * **Mini-Project:** Build a standalone typed Express + Zod REST API (e.g., Bookmark Manager or Expense Tracker) with **Core**, **Stretch**, and **Challenge** tiers.

### Phase 2: Databases, Security, Testing & Real-Time + Class-Wide Project (Days 5–8)

* **Day 5: PostgreSQL & Type-Safe Data Access**
  * **Topics:** Relational schema design, running PostgreSQL via `docker-compose.yml`, `pg` driver vs. typed ORMs (**Drizzle ORM** or **Prisma**), migrations, seeding, joins, pagination, transactions.
  * **Coding Exercises:** Model `users` → `tasks`, write a migration, seed script, and atomic `db.transaction()`.
  * **Mini-Project:** Build a standalone Postgres-backed data-access module (inventory or notes repository) with **Core**, **Stretch**, and **Challenge** tiers.
  * **Class-Wide Project (FlowBoard — Day 1 of 4):** Kick off the **FlowBoard** team project. Set up squad repositories, `docker-compose.yml` Postgres, initial Express + Zod routes, and core Postgres tables (`boards`, `columns`, `tasks`) with migrations.

* **Day 6: Authentication, Authorization & API Security**
  * **Topics:** Password hashing (`argon2`/`bcrypt`), JWTs + typing `req.user` via Express declaration merging, RBAC middleware, `helmet`, CORS config, rate limiting, SQL injection prevention.
  * **Coding Exercises:** Implement password/JWT helpers, `req.user` declaration merging, and `requireAuth`/`requireRole`.
  * **Mini-Project:** Build a standalone auth & RBAC middleware sandbox with **Core**, **Stretch**, and **Challenge** tiers.
  * **Class-Wide Project (FlowBoard — Day 2 of 4):** Add `/auth/register`, `/auth/login`, `requireAuth` middleware, and workspace role checks to FlowBoard.

* **Day 7: Testing TypeScript APIs & OpenAPI Docs**
  * **Topics:** **Vitest** + **Supertest**, integration testing against a test Postgres database, mocking external services, generating OpenAPI/Swagger docs from Zod schemas.
  * **Coding Exercises:** Write Vitest + Supertest integration tests for a 2-endpoint module with a mocked `MailerService`.
  * **Mini-Project:** Write a focused Vitest + Supertest integration test suite and OpenAPI/Swagger spec with **Core**, **Stretch**, and **Challenge** tiers.
  * **Class-Wide Project (FlowBoard — Day 3 of 4):** Write cross-teammate integration tests covering auth, validation errors, and Postgres CRUD, and generate OpenAPI docs for FlowBoard.

* **Day 8: Real-Time, External APIs & Background Jobs**
  * **Topics:** WebSockets (`ws` or `socket.io`) with shared TypeScript event types, typed `fetch` calls to 3rd-party APIs (timeouts/retries), `node-cron` / background job patterns, file uploads (`multer`).
  * **Coding Exercises:** Build `fetchJsonWithRetry<T>` + typed WebSocket broadcast handler.
  * **Mini-Project:** Build a standalone WebSocket notification ticker + `node-cron` background job with **Core**, **Stretch**, and **Challenge** tiers.
  * **Class-Wide Project (FlowBoard — Day 4 of 4, Final Sprint):** Add real-time WebSocket board updates + an async background worker, connect the pre-built Vite Kanban UI, tag `v1.0.0`, and run end-of-day squad wrap-up demos.

### Phase 3: Production Readiness, Deployment & Wrap-Up (Days 9–10)

*(No mini-projects and no class-wide project on Days 9–10.)*

* **Day 9: Production Readiness, Observability & Debugging Clinics**
  * **Topics:** `/health` & readiness endpoints checking PostgreSQL connectivity, graceful `SIGTERM`/`SIGINT` shutdown, structured `pino` JSON logging & correlation IDs (tailored for **Railway's** log explorer and service metrics), memory & event-loop profiling, and full-stack CORS/auth troubleshooting.
  * **Format:** Instructor-led live debugging clinics, guided coding exercises, and interactive architecture reviews.

* **Day 10: Docker, CI/CD, Cloud Deployment & Course Wrap-Up**
  * **Morning:** Multi-stage `Dockerfile` for Node + TypeScript (`tsc` build → slim runtime image), GitHub Actions CI/CD pipelines, provisioning a free **Neon** PostgreSQL database, and deploying the Dockerized Express app to **Railway** (verifying `/health` checks, `SIGTERM` shutdown logs, and live metrics in Railway's observability dashboard).
  * **Afternoon:** Guided deployment walkthroughs, final knowledge check / Q&A, and ecosystem next steps (Next.js/SSR, NestJS, GraphQL, BullMQ).

---

## 4. Class-Wide Project: "FlowBoard" (Days 5–8)

**Concept:** A collaborative team Kanban/task API (mini Trello/Linear) paired with a pre-built Vite frontend UI.  
**Squad Structure:** Groups of **3–4 students** per repository.

### GitHub Repository Rules
* **Branch protection on `main`:** Require Pull Requests (no direct pushes), at least **1 peer approval**, and passing **GitHub Actions CI** (`tsc --noEmit`, `eslint`, `vitest`).
* **Issue tracking:** Use GitHub Issues + Projects; link PRs with `Closes #<issue>`.
* **PR Template (`.github/pull_request_template.md`):** Require a summary, how it was tested, and a typecheck/test checklist.
* **Release Captain rotation:** Rotate one student per squad each day to be responsible for reviewing PRs, keeping `main` green, and helping resolve conflicts.

### Day-by-Day GitHub & Collaboration Progression

| Day | Squad Feature Split | GitHub Collaboration Lesson |
| :--- | :--- | :--- |
| **Day 5** | Each student scaffolds their route/table slice (`boards`, `columns`, `tasks`) with Zod + Drizzle/Prisma migrations. | **First Branch, PR & Controlled Merge Conflict #1 (`routes/index.ts` & `schema.ts`):** Open feature PRs, leave constructive review comments, and practice resolving real merge conflicts at shared registration/schema files. |
| **Day 6** | Student A: `/auth/register` & `/login`<br>Student B: `requireAuth` middleware<br>Student C: Workspace RBAC | **Coordinating Dependent PRs:** Auth changes `req.user` types and breaks existing routes. Students merge/rebase `main` into active feature branches mid-flight and update tests. |
| **Day 7** | Each student writes Vitest + Supertest specs for a *teammate's* endpoints + OpenAPI docs. | **Cross-Testing & Bug Triage:** Testing someone else's code surfaces edge cases; students file GitHub Issues for bugs found and resolve them via PRs. |
| **Day 8** | Student A: WebSockets (`task:moved`)<br>Student B: Overdue-task cron/worker & activity log<br>Student C: Vite Kanban UI hookup & bug fixes | **Controlled Merge Conflict #2 (`server.ts` & `package.json`) & Release Tagging:** Resolve `package-lock.json` conflicts cleanly (`npm install` after resolving `package.json`), tag `v1.0.0` on `main`, and run wrap-up demos. |

---

## 5. Instructor Tooling & Teaching Tips

* **JavaScript First (Days 1–2) → TypeScript (Day 3+):** Letting students master variables, functions, async/await, and Node basics in plain JS first reduces cognitive load before introducing `tsconfig.json`, `tsx`, and `tsc`.
* **Zero-Friction Postgres:** Provide a `docker-compose.yml` for local Postgres on Day 5 so students don't lose class time to local installation issues, and use **Neon** (free tier) for cloud PostgreSQL on Day 10 alongside **Railway** for app hosting and observability.
* **Merge Conflict Drill (Day 5, 20 min):** Before organic conflicts happen, have every squad intentionally edit the same line of `README.md` or `src/routes/index.ts` on two branches and walk through resolving it together in VS Code.
* **Tiered Mini-Project Prompts (Days 1–8):** Give every daily mini-project a **Core** (required), **Stretch** (fast finishers), and **Challenge** (extra credit) tier.
