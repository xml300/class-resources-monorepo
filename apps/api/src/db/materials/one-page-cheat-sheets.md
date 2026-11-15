# 10-Day Node.js & TypeScript One-Page Cheat Sheets

Six printable/scannable reference sheets aligned to the 10-day curriculum.

---

## Sheet 1: Modern JavaScript & Node.js Essentials (Days 1–2)

### Variables & Control Flow
```js
const maxRetries = 3;          // Default choice: cannot reassign binding
let count = 0;                 // Reassignable binding
const status = count > 0 ? "active" : "empty"; // Ternary
```
* Always use strict equality `===` / `!==` (never `==`).
* Falsy values: `false`, `0`, `""`, `null`, `undefined`, `NaN` (everything else—including `[]` and `{}`—is truthy).

### Array Methods (Non-Mutating)
```js
const nums = [1, 2, 3, 4];
const doubled = nums.map((n) => n * 2);                // [2, 4, 6, 8]
const evens   = nums.filter((n) => n % 2 === 0);       // [2, 4]
const first   = nums.find((n) => n > 2);               // 3 (or undefined)
const total   = nums.reduce((sum, n) => sum + n, 0);   // 10
```

### ESM Modules & `package.json`
```json
{ "type": "module" }
```
```js
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
```

### Async/Await & Concurrency
```js
// Sequential (slow if independent)
const a = await fetchA();
const b = await fetchB();

// Concurrent (fast!)
const [user, posts] = await Promise.all([fetchUser(), fetchPosts()]);

// Partial failures allowed
const results = await Promise.allSettled([task1(), task2()]);
```

### Zero-Dependency `node:http` Server
```js
import http from "node:http";

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(3000);
```

---

## Sheet 2: TypeScript for Node.js Backends (Day 3+)

### Core Types & `interface` vs `type`
```ts
interface User {
  id: string;
  email: string;
  role: "admin" | "member"; // Union literal
}

type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };
```

### Type Narrowing
```ts
function handle(res: Result<User>) {
  if (!res.ok) {
    return console.error(res.error); // narrowed to { ok: false; error: string }
  }
  console.log(res.data.email);       // narrowed to { ok: true; data: User }
}
```
* Prefer `unknown` over `any` for untyped inputs (`JSON.parse`, `catch (err)`), then narrow with `typeof`, `instanceof`, or Zod.

### Essential Utility Types
| Utility | Meaning | Example |
| :--- | :--- | :--- |
| `Partial<T>` | All fields optional | `Partial<User>` (PATCH body) |
| `Pick<T, K>` | Keep only keys `K` | `Pick<User, "id" \| "email">` |
| `Omit<T, K>` | Drop keys `K` | `Omit<User, "passwordHash">` |
| `Record<K, V>` | Typed dictionary | `Record<string, number>` |

### `tsconfig.json` (Node + ESM)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  }
}
```
* **Dev:** `npx tsx watch src/server.ts`
* **Typecheck:** `npx tsc --noEmit`
* **Build:** `npx tsc` → `node dist/server.js`

### Express `req.user` Declaration Merging (`src/types/express.d.ts`)
```ts
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: "admin" | "member" };
    }
  }
}
export {};
```

---

## Sheet 3: Express.js, Zod & Error Handling (Day 4)

### Layered Architecture
`routes` (URL + middleware) → `controllers` (HTTP `req`/`res`) → `services` (business logic) → `db/repositories` (SQL)

### Zod Schema + Static Type Inference
```ts
import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1).max(120),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
```

### Generic Zod Validation Middleware
```ts
import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

export const validate = (schemas: {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}): RequestHandler => (req, _res, next) => {
  if (schemas.body)   req.body   = schemas.body.parse(req.body);
  if (schemas.query)  req.query  = schemas.query.parse(req.query);
  if (schemas.params) req.params = schemas.params.parse(req.params);
  next();
};
```

### Centralized `AppError` & 4-Arg Error Handler
```ts
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

// Register LAST in app.ts: app.use(errorHandler)
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.flatten() });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal server error" });
};
```

### HTTP Status Codes
`200` OK · `201` Created · `204` No Content · `400` Bad Request · `401` Unauthorized (not logged in) · `403` Forbidden (no permission) · `404` Not Found · `409` Conflict · `429` Too Many Requests · `500` Internal Error

---

## Sheet 4: PostgreSQL, Drizzle & Auth Security (Days 5–6)

### Local Postgres via Docker Compose
```bash
docker compose up -d          # Start Postgres in background
docker compose logs -f db     # View DB logs
docker compose down -v        # Stop & wipe volumes (fresh reset)
```

### Drizzle ORM Quick Patterns
```ts
// Select with filter
const rows = await db.select().from(tasks).where(eq(tasks.boardId, boardId));

// Insert returning created row
const [created] = await db.insert(tasks).values({ title, boardId }).returning();

// Atomic Transaction
await db.transaction(async (tx) => {
  await tx.update(accounts).set({ balance: sql`${accounts.balance} - ${amt}` }).where(eq(accounts.id, fromId));
  await tx.update(accounts).set({ balance: sql`${accounts.balance} + ${amt}` }).where(eq(accounts.id, toId));
});
```

### Auth & RBAC Middleware
```ts
// Password hashing (argon2)
const hash = await argon2.hash(password);
const valid = await argon2.verify(hash, password);

// JWT sign & verify
const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: "1h" });
const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: "admin" | "member" };
```
* **Middleware order:** `helmet()` → `cors({ origin })` → `rateLimit(...)` → `express.json()` → routes (`requireAuth` → `requireRole("admin")`) → `errorHandler`.

---

## Sheet 5: Testing, WebSockets & Production (Days 7–10)

### Vitest + Supertest
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("POST /tasks", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns 201 for valid payload", async () => {
    const res = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Write tests" });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Write tests");
  });
});
```

### Typed WebSockets (`ws`)
```ts
type ServerEvent =
  | { type: "task:moved"; payload: { taskId: string; columnId: string } }
  | { type: "board:sync"; payload: { count: number } };

function broadcast(wss: WebSocketServer, event: ServerEvent) {
  const raw = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(raw);
  }
}
```

### Graceful Shutdown & `/health`
```ts
app.get("/health", async (_req, res) => {
  await db.execute(sql`SELECT 1`);
  res.json({ status: "ok" });
});

const shutdown = (signal: string) => {
  logger.info({ signal }, "Shutting down gracefully");
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

### Multi-Stage `Dockerfile`
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/server.js"]
```

---

## Sheet 6: Git & GitHub Squad Workflow (FlowBoard Days 5–8)

### Daily Feature Branch Flow
```bash
git switch main
git pull origin main
git switch -c feat/task-routes
# ... code & commit ...
git add -p
git commit -m "feat: add task CRUD routes"
git push -u origin feat/task-routes
```
Open PR on GitHub → include `Closes #<issue-number>` in description → pass CI → get 1 peer approval → **Squash & Merge**.

### Updating Your Branch When `main` Moves
```bash
git fetch origin
git rebase origin/main        # Or: git merge origin/main
# Fix conflicts if any, then:
git add .
git rebase --continue         # Or: git commit (if merging)
git push --force-with-lease   # Only needed after rebase
```

### Resolving `package-lock.json` Conflicts
Never edit `package-lock.json` by hand!
1. Resolve conflicts in `package.json` first.
2. Run `npm install` — npm automatically regenerates a clean `package-lock.json`.
3. `git add package.json package-lock.json && git commit`.
