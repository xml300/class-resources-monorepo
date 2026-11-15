# Day 3: TypeScript Foundations & Connecting Node to a Frontend

## Coding Exercises

### Exercise 3.1 — Strict TS Migration & `Result<T, E>`
Convert a plain JavaScript config-loader module to strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`), returning a discriminated union `Result<Config, string>` instead of throwing raw strings.

### Exercise 3.2 — Narrowing `unknown` Safely
Write a `parseUserPayload(input: unknown)` function that narrows `input` without using `any` or `as`, verifying it is a non-null object with a string `email` and a number `age`.

### Exercise 3.3 — Utility Types Practice
Given a `User` interface (`id`, `email`, `passwordHash`, `role`), derive `PublicUser` (using `Omit`), `UpdateUserDto` (using `Partial<Pick<...>>`), and a `Record<string, PublicUser>` lookup map.

### Exercise 3.4 — Typed `parseJsonBody<T>(req)`
Write a generic `parseJsonBody<T>(req: IncomingMessage): Promise<T>` helper that rejects payloads larger than 1MB and handles malformed JSON cleanly.

### Exercise 3.5 — Reusable CORS Middleware Helper
Write a `withCors(req, res, allowedOrigin)` helper that sets `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers`, and handles `OPTIONS` preflight requests with `204`.

---

## Mini-Project: Strict-TS HTTP API + `day03-frontend/` Integration

Build a strict TypeScript `node:http` backend and connect it to the pre-built `day03-frontend/` Vite app.

### Core (Required)
* Configure `tsconfig.json` (`NodeNext`, `strict: true`) with `dev` (`tsx watch`) and `typecheck` (`tsc --noEmit`) npm scripts.
* Implement `GET /api/items`, `POST /api/items`, and `DELETE /api/items/:id` with proper `OPTIONS` preflight CORS headers.
* Connect `day03-frontend/` and verify you can create, list, and delete items in the browser with no CORS errors.

### Stretch
* Add `PATCH /api/items/:id` to toggle an item's completion status.
* Use your `Result<T, ApiError>` helper across all service functions so error responses are consistently typed.

### Challenge
* Add query-string filtering (`?q=search&status=done`) and pagination (`?page=1&limit=10`) with typed query-parameter parsing.
