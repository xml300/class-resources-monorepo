# Day 2: Node.js Ecosystem, Modules, Async JS & HTTP Fundamentals

## Coding Exercises

### Exercise 2.1 — ESM Module Split
Set `"type": "module"` in `package.json`, then split a single script into `math.js` (named exports `add`, `average`) and `index.js` (imports and runs them).

### Exercise 2.2 — Sequential vs. `Promise.all` Benchmark
Given a mock `fetchPrice(id)` function that takes 300ms, refactor a sequential `for...of` `await` loop over 5 IDs to run concurrently with `Promise.all`. Log the total elapsed time before and after (`~1500ms` down to `~300ms`).

### Exercise 2.3 — Resilient Batch Fetcher
Call an async `checkService(url)` function across 4 URLs where 1 URL rejects. Use `Promise.allSettled` to return `{ succeeded: [...], failed: [...] }` without crashing the whole batch.

### Exercise 2.4 — Streaming Line Counter
Use `fs.createReadStream()` and `readline` (or a `Transform` stream) with `pipeline` to count error lines in a large log file without loading the entire file into memory.

### Exercise 2.5 — 2-Route `node:http` Server
Build an ESM server with two routes:
* `GET /health` — responds with `200` and `{ "ok": true }`.
* `POST /echo` — reads the incoming request body chunks and echoes the parsed JSON back.

---

## Mini-Project: Zero-Dependency URL Shortener HTTP API

Build a REST-style JSON API using **only built-in Node.js modules** (`node:http`, `node:fs/promises`, `node:crypto`).

### Core (Required)
* `GET /links` — returns all saved short links from `links.json`.
* `POST /links` — accepts `{ url }`, generates a 6-character code using `crypto.randomBytes(3).toString("hex")`, saves it to `links.json`, and returns `201`.
* `GET /:code` — responds with a `302` redirect (`Location` header) to the original URL, or `404` JSON if the code does not exist.

### Stretch
* Track a `clicks` count for each link and expose `GET /links/:code/stats`.
* Validate that `url` begins with `http://` or `https://` and return `400` if invalid.

### Challenge
* Add a `GET /export` route that streams `links.json` using `fs.createReadStream` + `pipeline` compressed with `Content-Encoding: gzip` (via `node:zlib`).
