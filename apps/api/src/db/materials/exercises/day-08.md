# Day 8: Real-Time WebSockets, External APIs & Background Jobs

## Coding Exercises

### Exercise 8.1 — `fetchJsonWithRetry<T>`
Write a typed `fetch` wrapper with `AbortSignal.timeout(5000)`, explicit `res.ok` error handling, and exponential backoff up to 3 retries on `5xx` or network failures.

### Exercise 8.2 — Typed WebSocket Broadcaster
Build a `ws` server that shares a discriminated union `ServerEvent` type and broadcasts JSON updates to all connected clients.

### Exercise 8.3 — Validating Incoming WS Messages with Zod
Parse incoming client WebSocket messages with `JSON.parse` + a Zod discriminated union schema, sending back `{ type: "error", message }` when a client sends invalid JSON or an unknown event.

### Exercise 8.4 — Scheduled Background Job
Create a `node-cron` job that runs every minute, queries for overdue tasks in memory or Postgres, and logs a structured summary.

### Exercise 8.5 — File Upload Endpoint
Add a `POST /uploads` route using `multer` with a 2MB file size limit and an allowlist for `.png`/`.jpg`/`.pdf` files.

---

## Mini-Project: Real-Time Ticker + `node-cron` Worker

Build a standalone background job that pushes live updates over WebSockets.

### Core (Required)
* Schedule a `node-cron` job that runs every 10 seconds, generates or fetches a status update, and broadcasts `{ type: "ticker:update", payload }` to all connected WebSocket clients.

### Stretch
* Support channel subscriptions (`{ type: "subscribe", channel: "alerts" }`) so clients only receive events for channels they subscribed to.

### Challenge
* Implement heartbeat `ping`/`pong` checks to detect and close dead WebSocket connections automatically.

---

## FlowBoard Squad Sprint — Day 4 of 4 (Final Sprint)

* **Sprint Goal:** Add real-time `task:moved` WebSocket updates and an overdue-task cron worker, connect the pre-built Vite Kanban UI, resolve any `package-lock.json` conflicts cleanly, tag `v1.0.0` on `main`, and demo your app.
