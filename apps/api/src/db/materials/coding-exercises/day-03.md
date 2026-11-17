# Day 3: TypeScript Foundations, `node:http` & Connecting to a Frontend

## Coding Exercises

### Exercise 3.1 — Strict TS Migration
Convert a plain JavaScript config-loader module to strict TypeScript, returning a typed success/error result object instead of throwing raw strings.

### Exercise 3.2 — Narrowing `unknown` Safely
Write a `parseUserPayload(input: unknown)` function that narrows `input` without using `any` or type assertions, verifying it is a non-null object with a string `email` and a number `age`.

### Exercise 3.3 — Utility Types Practice
Given a `User` interface with `id`, `email`, `passwordHash`, and `role`, derive a `PublicUser` type without `passwordHash`, an `UpdateUserDto` type with optional updatable fields, and a lookup map keyed by user ID.

### Exercise 3.4 — 2-Route `node:http` Server (Moved from Day 2)
Build a TypeScript `node:http` server (`src/server.ts`) with two routes:
* `GET /health` — responds with `200` and `{ "ok": true }`.
* `POST /echo` — reads the incoming request body chunks (`for await (const chunk of req)`) and echoes the parsed JSON back (`400` on invalid JSON, `404` for unknown routes).

### Exercise 3.5 — Typed `parseJsonBody<T>(req)`
Write a generic `parseJsonBody<T>(req)` helper that rejects payloads larger than 1MB (`413`) and handles malformed JSON cleanly (`400`).

### Exercise 3.6 — Reusable CORS Middleware Helper
Write a `withCors(req, res, allowedOrigin)` helper that sets the required CORS headers and handles `OPTIONS` preflight requests with `204`.
