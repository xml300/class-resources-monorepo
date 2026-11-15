# Mini-Projects & Coding Exercises Handbook (Days 1–10)

Companion guide to [nodejs-curriculum.md](https://drive.google.com/file/d/1zHuGF1YVt5qSX_-UJijFKHTFJE0i9DTj/view).  
Every day follows the same hands-on cadence:
1. **9:00 – 9:15 AM:** Morning Warm-Up (*Predict the Output* or *Spot the Bug*)
2. **10:45 – 12:00 PM:** Guided Coding Exercises
3. **1:00 – 2:30 PM (+ 2:45 – 3:45 PM):** Daily Mini-Project with **Core**, **Stretch**, and **Challenge** tiers (Days 1–8) or Production Labs (Days 9–10).

---

## Day 1: Programming Basics in JS & Intro to Node.js

### 1. Morning Warm-Up (9:00 – 9:15 AM)
**Predict the output:**
```js
const user = { name: "Ada", scores: [10, 20] };
user.scores.push(30);
console.log(user.scores.length);
console.log("5" == 5, "5" === 5);
```
*Discussion point:* `const` locks the variable binding, not object/array contents; always use `===`.

### 2. Guided Coding Exercises (10:45 – 12:00 PM)
* **Exercise 1.1 — Gradebook Analyzer (Loops & Conditionals):**  
  Given an array of `{ name, score }` objects, write `summarizeGrades(students)` returning `{ highest, lowest, average, passingNames }` (passing `>= 70`).
* **Exercise 1.2 — Inventory Filter (Array Methods & Functions):**  
  Write `getLowStock(items, threshold = 5)` using `.filter()` and `.map()` to return formatted strings like `"Keyboard (2 left)"`.
* **Exercise 1.3 — First File Reader (`node:fs/promises`):**  
  Read a local `notes.txt` file, count total lines and non-empty lines, and print the result using `process.argv[2]` as the filename.

### 3. Mini-Project: `todo-cli` (JSON-Backed CLI Utility)
Build a command-line task manager that persists tasks to `data.json`.
* **Core (Required):**
  * `node todo.js add "Buy milk"` — appends `{ id, title, done: false, createdAt }` to `data.json`.
  * `node todo.js list` — prints all tasks with `[ ]` or `[x]` status.
  * `node todo.js done <id>` — marks a task complete and saves `data.json`.
  * Gracefully handle missing `data.json` on first run (create `[]`).
* **Stretch:**
  * Add `node todo.js remove <id>` and `node todo.js list --pending` / `--done`.
  * Print a clean formatted summary line (`2/5 completed`).
* **Challenge:**
  * Add `node todo.js export csv` to write `todos.csv` with proper header row.
  * Reject empty titles or non-numeric IDs with a helpful error message and `process.exitCode = 1`.

---

## Day 2: Node.js Ecosystem, Modules, Async JS & HTTP Fundamentals

### 1. Morning Warm-Up (9:00 – 9:15 AM)
**Predict the execution order:**
```js
console.log("1: start");
setTimeout(() => console.log("2: timeout"), 0);
Promise.resolve().then(() => console.log("3: promise"));
console.log("4: end");
```
*Answer:* `1 → 4 → 3 → 2` (microtasks drain before the next timer phase).

### 2. Guided Coding Exercises (10:45 – 12:00 PM)
* **Exercise 2.1 — Sequential vs. `Promise.all` Benchmark:**  
  Given a mock `fetchPrice(id)` taking 300ms, refactor a `for...of` `await` loop over 5 IDs to `Promise.all` and log total elapsed time (`~1500ms` → `~300ms`).
* **Exercise 2.2 — Streaming Line Counter (`stream/promises`):**  
  Use `fs.createReadStream()` + `readline` (or `Transform` stream) with `pipeline` to count error lines in a large log file without loading it all into memory.
* **Exercise 2.3 — 2-Route `node:http` Server:**  
  Build an ESM server with `GET /health` (`200 { ok: true }`) and `POST /echo` (reads request body chunks and echoes JSON back).

### 3. Mini-Project: Zero-Dependency Quote / URL Shortener HTTP API
Build a REST-style JSON API using **only built-in Node.js modules** (`node:http`, `node:fs/promises`, `node:crypto`).
* **Core (Required):**
  * `GET /links` — list all saved short links.
  * `POST /links` — accept `{ url }`, generate a 6-char code with `crypto.randomBytes(3).toString("hex")`, save to `links.json`, return `201`.
  * `GET /:code` — respond with `302` redirect (`Location` header) or `404` JSON error.
* **Stretch:**
  * Track `clicks` count per link and return `GET /links/:code/stats`.
  * Validate that `url` starts with `http://` or `https://` (`400` otherwise).
* **Challenge:**
  * Add a `GET /export` route that streams `links.json` using `fs.createReadStream` + `pipeline` with `Content-Encoding: gzip` (via `node:zlib`).

---

## Day 3: TypeScript Foundations & Connecting Node to a Frontend

### 1. Morning Warm-Up (9:00 – 9:15 AM)
**Spot the TypeScript bug:**
```ts
function parseId(input: unknown): number {
  return Number(input.trim());
}
```
*Fix:* Narrow `typeof input === "string"` before calling `.trim()`, and check `!Number.isNaN(...)`.

### 2. Guided Coding Exercises (10:45 – 12:00 PM)
* **Exercise 3.1 — Strict TS Migration & `Result<T, E>`:**  
  Convert a plain JS config-loader module to strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`), returning a discriminated union `Result<Config, string>`.
* **Exercise 3.2 — Typed `parseJsonBody<T>(req)` & CORS Helper:**  
  Write a generic `parseJsonBody<T>(req: IncomingMessage): Promise<T>` that rejects payloads over 1MB and handles invalid JSON cleanly, plus a CORS header helper.

### 3. Mini-Project: Strict-TS HTTP API + `day03-frontend/` Integration
Connect a strict TypeScript `node:http` backend to the pre-built `day03-frontend/` Vite app.
* **Core (Required):**
  * Configure `tsconfig.json` (`NodeNext`, `strict: true`) with `dev` (`tsx watch`) and `typecheck` (`tsc --noEmit`) scripts.
  * Implement `GET /api/items`, `POST /api/items`, `DELETE /api/items/:id` with proper `OPTIONS` preflight CORS headers.
  * Verify `day03-frontend/` can create, list, and delete items in the browser without CORS errors.
* **Stretch:**
  * Add `PATCH /api/items/:id` to toggle completion status.
  * Replace thrown strings with a typed `Result<T, ApiError>` helper.
* **Challenge:**
  * Add query-string filtering (`?q=search&status=done`) and pagination (`?page=1&limit=10`) with typed query-param parsing.

---

## Day 4: Express.js + TypeScript Architecture

### 1. Morning Warm-Up (9:00 – 9:15 AM)
**Spot the bug:**
```ts
app.use((req, res, next) => {
  console.log(req.method, req.url);
});
```
*Answer:* Missing `next()` — every request hangs forever.

### 2. Guided Coding Exercises (10:45 – 12:00 PM)
* **Exercise 4.1 — Generic Zod `validate()` Middleware:**  
  Implement `validate({ body, query, params })` using `ZodTypeAny` and verify `tsc --noEmit` passes.
* **Exercise 4.2 — Centralized `AppError` & `errorHandler`:**  
  Build `AppError(statusCode, message)` and a 4-argument Express error middleware that formats `ZodError` (400), `AppError` (custom status), and unexpected errors (500) consistently.

### 3. Mini-Project: Typed Express + Zod Bookmark Manager (or Expense Tracker)
Build a cleanly layered Express API (`routes → controllers → services`).
* **Core (Required):**
  * Endpoints: `GET /bookmarks`, `POST /bookmarks`, `PATCH /bookmarks/:id`, `DELETE /bookmarks/:id`.
  * Validate `body` and `params` with Zod; infer TS types with `z.infer`.
  * Zero business logic in route files; all errors routed through `next(err)` → `errorHandler`.
* **Stretch:**
  * Add `pino-http` structured request logging.
  * Support filtering by `?tag=nodejs` and sorting by `?sort=newest`.
* **Challenge:**
  * Add an `x-api-key` middleware for mutating routes (`POST`/`PATCH`/`DELETE`) and a `GET /bookmarks/export.csv` endpoint.

---

## Day 5: PostgreSQL & Type-Safe Data Access

*(Afternoon split: 1:00–2:30 PM Sandbox Mini-Project → 2:45–3:45 PM FlowBoard Sprint Day 1)*

### 1. Morning Warm-Up (9:00 – 9:15 AM)
**Spot the bug:**
```ts
await db.transaction(async (tx) => {
  await tx.insert(users).values({ email: "a@b.com" });
  await db.insert(profiles).values({ bio: "hi" }); // <-- Bug!
});
```
*Answer:* Line 3 uses `db` instead of `tx`, so it runs outside the transaction and won't roll back on failure.

### 2. Guided Coding Exercises (10:45 – 12:00 PM)
* **Exercise 5.1 — Schema & Migration:**  
  Boot Postgres via `docker compose up -d`, model `users` (1) → `tasks` (many) with foreign key `onDelete: "cascade"`, generate and run the migration.
* **Exercise 5.2 — Seed & Atomic Transaction:**  
  Write an idempotent `seed.ts` script and an atomic `assignTaskWithAudit(taskId, userId)` function using `db.transaction()`.

### 3. Mini-Project (1:00 – 2:30 PM): Postgres Inventory / Notes Repository
A focused 1-module data-access layer (dress rehearsal for FlowBoard).
* **Core (Required):**
  * Typed repository functions: `createNote`, `listNotes({ page, limit })`, `updateNote`, `deleteNote`.
  * Parameterized queries via Drizzle/Prisma (no raw string interpolation).
* **Stretch:**
  * Add full-text or `ILIKE` search by title/body + tag join table.
* **Challenge:**
  * Implement cursor-based pagination (`?cursor=...&limit=10`) returning `{ items, nextCursor }`.

### 4. FlowBoard Squad Sprint — Day 1 of 4 (2:45 – 3:45 PM)
* **20-Min Merge Conflict Drill:** Every squad intentionally edits `src/routes/index.ts` on two branches and resolves the conflict together.
* **Sprint Goal:** Squad repo setup, `docker-compose.yml` Postgres, initial migrations for `boards`, `columns`, and `tasks`, and first PRs merged with 1 peer approval + green CI.

---

## Day 6: Authentication, Authorization & API Security

*(Afternoon split: 1:00–2:30 PM Sandbox Mini-Project → 2:45–3:45 PM FlowBoard Sprint Day 2)*

### 1. Morning Warm-Up (9:00 – 9:15 AM)
**Spot the security flaw:**
```ts
if (user.password === req.body.password) {
  const token = jwt.sign({ id: user.id }, "secret123");
  res.json({ token, user });
}
```
*Issues:* Plaintext password comparison (use `argon2`/`bcrypt`), hardcoded weak JWT secret, no `expiresIn`, and leaking `user.passwordHash` in response.

### 2. Guided Coding Exercises (10:45 – 12:00 PM)
* **Exercise 6.1 — Password & JWT Helpers:**  
  Implement `hashPassword`, `verifyPassword`, `signToken`, and `verifyToken` with `env.JWT_SECRET`.
* **Exercise 6.2 — `req.user` Declaration Merging & RBAC:**  
  Add `src/types/express.d.ts`, write `requireAuth` (Bearer token check → `401`), and `requireRole(...roles)` (`403`).

### 3. Mini-Project (1:00 – 2:30 PM): Auth & RBAC Middleware Sandbox
* **Core (Required):**
  * `POST /auth/register`, `POST /auth/login`, `GET /me` (protected), `DELETE /admin/users/:id` (admin-only).
  * Return `401` when unauthenticated, `403` when authenticated without role.
* **Stretch:**
  * Add `helmet()`, strict `cors({ origin })`, and `express-rate-limit` on `/auth/login`.
* **Challenge:**
  * Add refresh-token rotation or an ownership check (`requireOwnerOrAdmin`) so members can only edit their own resources.

### 4. FlowBoard Squad Sprint — Day 2 of 4 (2:45 – 3:45 PM)
* **Sprint Goal:** Split `/auth/register` & `/login`, `requireAuth`, and workspace RBAC across squad members. Practice rebasing/merging `main` mid-flight when `req.user` types land.

---

## Day 7: Testing TypeScript APIs & OpenAPI Docs

*(Afternoon split: 1:00–2:30 PM Sandbox Mini-Project → 2:45–3:45 PM FlowBoard Sprint Day 3)*

### 1. Morning Warm-Up (9:00 – 9:15 AM)
**Spot the flaky test bug:**
```ts
it("creates user", async () => {
  const res = await request(app).post("/users").send({ email: "a@b.com" });
  expect(res.status).toBe(201);
});
```
*Discussion:* Why does this pass on run #1 and fail with `409 Conflict` on run #2? Missing DB cleanup/truncate in `beforeEach`.

### 2. Guided Coding Exercises (10:45 – 12:00 PM)
* **Exercise 7.1 — Vitest + Supertest + Mocked Service:**  
  Write integration tests for a 2-endpoint `POST /orders` & `GET /orders` module while mocking `MailerService.sendReceipt` with `vi.spyOn` / `vi.mock`.
* **Exercise 7.2 — Test DB Isolation:**  
  Configure `beforeEach` to truncate test tables cleanly against a dedicated test Postgres database.

### 3. Mini-Project (1:00 – 2:30 PM): Integration Test Suite & OpenAPI Spec
* **Core (Required):**
  * Write at least 6 Vitest + Supertest tests covering happy path (`201`/`200`), Zod validation error (`400`), unauthorized (`401`), and not found (`404`).
  * Generate an OpenAPI/Swagger UI endpoint (`/docs`) from your Zod schemas.
* **Stretch:**
  * Add coverage reporting (`vitest --coverage`) and reach `>= 80%` on services.
* **Challenge:**
  * Write a test helper `createAuthenticatedAgent(role)` to eliminate boilerplate across protected route tests.

### 4. FlowBoard Squad Sprint — Day 3 of 4 (2:45 – 3:45 PM)
* **Sprint Goal:** Cross-testing! Each student writes Vitest + Supertest specs for a *teammate's* FlowBoard endpoints, files GitHub Issues for bugs discovered, and fixes them via PRs.

---

## Day 8: Real-Time WebSockets, External APIs & Background Jobs

*(Afternoon split: 1:00–2:30 PM Sandbox Mini-Project → 2:45–3:45 PM FlowBoard Final Sprint)*

### 1. Morning Warm-Up (9:00 – 9:15 AM)
**Spot the bug:**
```ts
const res = await fetch("https://api.example.com/data");
const data = await res.json();
```
*Issues:* `fetch` does **not** throw on `404`/`500` (must check `if (!res.ok)`), and there is no timeout (`AbortSignal.timeout(5000)`).

### 2. Guided Coding Exercises (10:45 – 12:00 PM)
* **Exercise 8.1 — `fetchJsonWithRetry<T>`:**  
  Write a typed wrapper around `fetch` with `AbortSignal.timeout`, `res.ok` checking, and exponential backoff up to 3 retries on `5xx`/network errors.
* **Exercise 8.2 — Typed WebSocket Broadcaster:**  
  Build a `ws` server sharing a discriminated union `ServerEvent` type and broadcasting JSON updates to all open clients.

### 3. Mini-Project (1:00 – 2:30 PM): Real-Time Ticker + `node-cron` Worker
* **Core (Required):**
  * A `node-cron` job running every 10 seconds that fetches/generates a status update and broadcasts `{ type: "ticker:update", payload }` to connected WebSocket clients.
* **Stretch:**
  * Support room/channel subscriptions (`{ type: "subscribe", channel: "alerts" }`) so clients only receive subscribed events.
* **Challenge:**
  * Add heartbeat `ping`/`pong` cleanup to terminate dead WebSocket connections automatically.

### 4. FlowBoard Squad Sprint — Day 4 of 4, Final Sprint (2:45 – 3:45 PM)
* **Sprint Goal:** Add real-time `task:moved` WebSocket updates + overdue-task cron worker, connect the pre-built Vite Kanban UI, resolve `package-lock.json` conflicts cleanly, tag `v1.0.0`, and run end-of-day squad demos.

---

## Day 9: Production Readiness, Observability & Debugging Clinics

*(No mini-projects or FlowBoard sprints—100% clinic & lab focus)*

### Morning Warm-Up (9:00 – 9:15 AM)
**Spot the production hazard:** Why does `JSON.parse(hugeString)` inside an Express route hurt *every other* user's request? (Blocks the single-threaded Event Loop).

### Hands-On Debugging Labs
1. **Lab 9.1 — `/health` & Graceful Shutdown:**  
   Add a `/health` endpoint executing `SELECT 1` on Postgres (returning `503` if DB is down) and wire `SIGTERM`/`SIGINT` to close the HTTP server and DB pool cleanly.
2. **Lab 9.2 — Structured `pino` Logging & Correlation IDs:**  
   Attach a `requestId` (`crypto.randomUUID()` or `x-request-id` header) to every `pino` log line so all logs for one request can be traced in Railway's log explorer.
3. **Lab 9.3 — Broken App Clinic #1 (Event Loop & Memory):**  
   Profile a deliberately broken Express endpoint with a synchronous CPU loop / unbounded in-memory cache and fix it.
4. **Lab 9.4 — Broken App Clinic #2 (CORS, Cookies & Auth):**  
   Diagnose and fix a realistic full-stack failure (mismatched `CORS_ORIGIN`, missing `Access-Control-Allow-Credentials`, expired JWT handling).

---

## Day 10: Docker, CI/CD, Cloud Deployment & Wrap-Up

*(No mini-projects—100% deployment & verification focus)*

### Morning Warm-Up (9:00 – 9:15 AM)
**Spot the Docker mistake:** Why shouldn't your final runtime container stage include `devDependencies` or `src/*.ts`? (Bloated image size, slower cold starts, unnecessary attack surface).

### Hands-On Deployment Labs
1. **Lab 10.1 — Multi-Stage `Dockerfile` + `.dockerignore`:**  
   Build a slim production image (`builder` stage runs `tsc`; runtime stage copies `dist/` and `npm ci --omit=dev`). Test locally with `docker run --env-file .env -p 3000:3000`.
2. **Lab 10.2 — GitHub Actions CI Pipeline:**  
   Verify `.github/workflows/ci.yml` runs `npm ci`, `npx tsc --noEmit`, `npm run lint`, and `npm test` on every PR.
3. **Lab 10.3 — Neon + Railway Live Deployment:**  
   * Provision a free **Neon** PostgreSQL database and run Drizzle/Prisma migrations against it.
   * Deploy the Dockerized Express app to **Railway**, set environment variables (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`), and verify:
     * `GET /health` returns `200`
     * Structured `pino` JSON logs appear in Railway's log explorer
     * Redeploy/stop triggers clean `SIGTERM` shutdown logs
