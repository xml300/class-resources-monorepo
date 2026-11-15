# Day 4: Express.js + TypeScript Architecture

## Coding Exercises

### Exercise 4.1 — Typed Express Route & `RequestHandler`
Create a `healthRouter` using `Router()` and typed `RequestHandler` callbacks, returning `{ status: "ok", uptime: process.uptime() }`.

### Exercise 4.2 — Zod Schema & `z.infer`
Define a `createProductSchema` with Zod (`name`, `price` positive number, `tags` optional string array defaulting to `[]`) and export `type CreateProductInput = z.infer<typeof createProductSchema>`.

### Exercise 4.3 — Generic Zod `validate()` Middleware
Implement a reusable `validate({ body, query, params })` Express middleware using `ZodTypeAny` and confirm `tsc --noEmit` passes with zero errors.

### Exercise 4.4 — Centralized `AppError` & `errorHandler`
Build an `AppError(statusCode, message)` class and a 4-argument Express error-handling middleware that formats `ZodError` (`400`), `AppError` (custom status), and unexpected errors (`500`) into a consistent JSON shape.

### Exercise 4.5 — `pino` Request Logger Middleware
Configure `pino` + `pino-http` in `app.ts` so every incoming request logs its method, URL, status code, and response time in structured JSON.

---

## Mini-Project: Typed Express + Zod Bookmark Manager

Build a layered Express + TypeScript REST API (`routes → controllers → services`).

### Core (Required)
* Implement `GET /bookmarks`, `POST /bookmarks`, `PATCH /bookmarks/:id`, and `DELETE /bookmarks/:id`.
* Validate `body` and `params` with Zod schemas and infer TypeScript types using `z.infer`.
* Keep route files free of business logic and forward all errors through `next(err)` to your `errorHandler`.

### Stretch
* Add `pino-http` for structured request logging.
* Support filtering by `?tag=nodejs` and sorting by `?sort=newest`.

### Challenge
* Add an `x-api-key` middleware protecting mutating routes (`POST`, `PATCH`, `DELETE`) and a `GET /bookmarks/export.csv` endpoint.
