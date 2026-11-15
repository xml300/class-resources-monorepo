# Day 3: TypeScript Foundations & Connecting Node to a Frontend

## Coding Exercises

### Exercise 3.1 — Strict TS Migration
Convert a plain JavaScript config-loader module to strict TypeScript, returning a typed success/error result object instead of throwing raw strings.

### Exercise 3.2 — Narrowing `unknown` Safely
Write a `parseUserPayload(input: unknown)` function that narrows `input` without using `any` or type assertions, verifying it is a non-null object with a string `email` and a number `age`.

### Exercise 3.3 — Utility Types Practice
Given a `User` interface with `id`, `email`, `passwordHash`, and `role`, derive a `PublicUser` type without `passwordHash`, an `UpdateUserDto` type with optional updatable fields, and a lookup map keyed by user ID.

### Exercise 3.4 — Typed `parseJsonBody<T>(req)`
Write a generic `parseJsonBody<T>(req)` helper that rejects payloads larger than 1MB and handles malformed JSON cleanly.

### Exercise 3.5 — Reusable CORS Middleware Helper
Write a `withCors(req, res, allowedOrigin)` helper that sets the required CORS headers and handles `OPTIONS` preflight requests with `204`.
