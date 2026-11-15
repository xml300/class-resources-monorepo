# Cheat Sheet: Testing, WebSockets & Production (Days 7–10)

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
