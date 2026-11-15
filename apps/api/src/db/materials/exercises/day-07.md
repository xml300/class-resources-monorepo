# Day 7: Testing TypeScript APIs & OpenAPI Docs

## Coding Exercises

### Exercise 7.1 — Unit Testing a Pure Service
Write Vitest unit tests for a `calculateInvoiceTotal(items, discount)` function covering normal totals, empty arrays, and negative-discount edge cases.

### Exercise 7.2 — Vitest + Supertest Integration Test
Write Supertest tests for `POST /orders` and `GET /orders`, asserting both HTTP status codes and JSON response shapes.

### Exercise 7.3 — Mocking External Services
Mock `MailerService.sendReceipt` using `vi.spyOn` (and restore mocks in `beforeEach`) so tests verify the email helper was called once with the right arguments without sending real emails.

### Exercise 7.4 — Test Database Isolation
Configure `beforeEach` to truncate your test tables cleanly against a dedicated test PostgreSQL database so tests are deterministic and repeatable.

### Exercise 7.5 — OpenAPI Spec from Zod
Annotate two Zod-validated routes with OpenAPI metadata and serve interactive Swagger UI at `GET /docs`.

---

## Mini-Project: Integration Test Suite & OpenAPI Spec

Write a focused integration test suite and generate interactive API documentation.

### Core (Required)
* Write at least 6 Vitest + Supertest tests covering happy paths (`201`/`200`), Zod validation errors (`400`), unauthorized requests (`401`), and missing resources (`404`).
* Generate an OpenAPI/Swagger UI endpoint (`/docs`) from your Zod schemas.

### Stretch
* Enable coverage reporting (`vitest --coverage`) and reach at least `80%` coverage on your service layer.

### Challenge
* Build a reusable `createAuthenticatedAgent(role)` test helper to remove auth boilerplate across protected endpoint tests.

---

## FlowBoard Squad Sprint — Day 3 of 4

* **Sprint Goal:** Write Vitest + Supertest integration tests for a *teammate's* FlowBoard endpoints and generate OpenAPI docs. File GitHub Issues for any edge-case bugs you uncover and resolve them via PRs.
