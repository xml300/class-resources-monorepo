# Day 2: Node.js Ecosystem, Modules, Async JS & HTTP Fundamentals

## Coding Exercises

### Exercise 2.1 — ES Module Split
Convert a single script into a multi-file ES module project with `math.js` exporting `add` and `average`, and `index.js` importing and running them.

### Exercise 2.2 — Sequential vs. Concurrent Benchmark
Given a mock `fetchPrice(id)` function that takes 300ms, refactor a sequential loop over 5 IDs to run concurrently and log the total elapsed time before and after.

### Exercise 2.3 — Resilient Batch Fetcher
Call an async `checkService(url)` function across 4 URLs where 1 URL rejects, returning `{ succeeded: [...], failed: [...] }` without crashing the batch.

### Exercise 2.4 — Streaming Line Counter
Count error lines in a large log file without loading the entire file into memory.

### Exercise 2.5 — 2-Route HTTP Server
Build an ES module HTTP server with two routes:
* `GET /health` — responds with `200` and `{ "ok": true }`.
* `POST /echo` — reads the incoming request body and echoes the parsed JSON back.
