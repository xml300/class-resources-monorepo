# Day 4: Express.js + TypeScript Architecture

## Coding Exercises

### Exercise 4.1 — Typed Express Route
Create a typed `healthRouter` with a `GET /health` route returning `{ status: "ok", uptime }`.

### Exercise 4.2 — Request Schema & Type Inference
Define a product creation validation schema for `name`, positive `price`, and optional `tags` defaulting to `[]`, and derive its TypeScript type directly from the schema.

### Exercise 4.3 — Generic `validate()` Middleware
Implement a reusable `validate({ body, query, params })` Express middleware and confirm typechecking passes with zero errors.

### Exercise 4.4 — Centralized `AppError` & `errorHandler`
Build an `AppError` class and a centralized Express error-handling middleware that formats validation errors (`400`), `AppError` responses, and unexpected errors (`500`) into a consistent JSON shape.

### Exercise 4.5 — Request Logger Middleware
Configure structured JSON request logging so every incoming request logs its method, URL, status code, and response time.
