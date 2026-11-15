# Day 9: Production Readiness, Observability & Debugging Clinics

## Coding Exercises & Production Labs

### Exercise 9.1 — `/health` Readiness Endpoint
Add a `GET /health` endpoint that checks PostgreSQL connectivity and returns `200 { status: "ok" }` when healthy, or `503 { status: "error" }` if unreachable.

### Exercise 9.2 — Graceful `SIGTERM` / `SIGINT` Shutdown
Handle `SIGTERM` and `SIGINT` signals to stop accepting new connections, close the Postgres connection pool, and exit with code `0`.

### Exercise 9.3 — Structured Logging & Correlation IDs
Attach a unique `requestId` to every structured log line so you can trace all logs belonging to a single request.

### Lab 9.4 — Debugging Clinic: Event Loop Blocking
Profile an Express route that blocks the Event Loop with heavy synchronous work, measure its impact on concurrent `/health` requests, and refactor it to be non-blocking.

### Lab 9.5 — Debugging Clinic: Memory Leak Diagnosis
Identify an unbounded in-memory cache growing on every request, inspect memory growth, and replace it with a bounded cache or database query.

### Lab 9.6 — Debugging Clinic: CORS, Cookies & Auth
Troubleshoot and fix a broken frontend-to-backend request caused by mismatched `CORS_ORIGIN`, missing credentials headers, and unhandled expired JWT errors.
