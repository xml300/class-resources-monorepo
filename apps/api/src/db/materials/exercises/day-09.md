# Day 9: Production Readiness, Observability & Debugging Clinics

## Coding Exercises & Production Labs

### Exercise 9.1 — `/health` Readiness Endpoint
Add a `GET /health` endpoint that executes `SELECT 1` against PostgreSQL and returns `200 { status: "ok" }` when healthy, or `503 { status: "error" }` if the database is unreachable.

### Exercise 9.2 — Graceful `SIGTERM` / `SIGINT` Shutdown
Wire `process.on("SIGTERM", ...)` and `process.on("SIGINT", ...)` handlers to stop accepting new connections (`server.close()`), close the Postgres connection pool, and exit with code `0`.

### Exercise 9.3 — Structured `pino` Logging & Correlation IDs
Attach a unique `requestId` (`crypto.randomUUID()` or incoming `x-request-id` header) to every `pino` log line so you can trace all logs belonging to a single request.

### Lab 9.4 — Debugging Clinic: Event Loop Blocking
Profile an Express route that blocks the Event Loop with heavy synchronous work, measure its impact on concurrent `/health` requests, and refactor it to be non-blocking.

### Lab 9.5 — Debugging Clinic: Memory Leak Diagnosis
Identify an unbounded in-memory cache growing on every request, inspect heap usage with `process.memoryUsage()`, and replace it with a bounded LRU cache or database query.

### Lab 9.6 — Debugging Clinic: CORS, Cookies & Auth
Troubleshoot and fix a broken frontend-to-backend request caused by mismatched `CORS_ORIGIN`, missing credentials headers, and unhandled expired JWT errors.
