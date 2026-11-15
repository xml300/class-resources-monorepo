# Day 7: Testing TypeScript APIs & OpenAPI Docs

## Coding Exercises

### Exercise 7.1 — Unit Testing a Pure Service
Write unit tests for a `calculateInvoiceTotal(items, discount)` function covering normal totals, empty arrays, and negative-discount edge cases.

### Exercise 7.2 — Integration Testing Endpoints
Write integration tests for `POST /orders` and `GET /orders`, asserting both HTTP status codes and JSON response shapes.

### Exercise 7.3 — Mocking External Services
Mock `MailerService.sendReceipt` so tests verify the email helper was called once with the right arguments without sending real emails, and ensure mocks reset between tests.

### Exercise 7.4 — Test Database Isolation
Ensure your test database is reset between test cases against a dedicated test PostgreSQL database so tests are deterministic and repeatable.

### Exercise 7.5 — OpenAPI Spec
Annotate two validated routes with OpenAPI metadata and serve interactive API documentation at `GET /docs`.
