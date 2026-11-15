# Day 5: PostgreSQL & Type-Safe Data Access

## Coding Exercises

### Exercise 5.1 — Boot Postgres & Verify Connection
Start PostgreSQL using `docker compose up -d`, configure `DATABASE_URL` in `.env`, and run a quick script executing `SELECT 1` to confirm connectivity.

### Exercise 5.2 — Schema & Migration
Model a one-to-many `users` → `tasks` schema with `onDelete: "cascade"`, then generate and run your first Drizzle/Prisma migration.

### Exercise 5.3 — Idempotent Seed Script
Write a `seed.ts` script that inserts 2 sample users and 5 tasks using `onConflictDoNothing()` (or `upsert`) so running it multiple times never fails or duplicates rows.

### Exercise 5.4 — Joins & Offset Pagination
Write a query `listTasksWithAssignee({ page, limit })` that joins `tasks` with `users` (returning assignee email, excluding `passwordHash`) and supports `limit`/`offset` pagination.

### Exercise 5.5 — Atomic Transaction
Write an `assignTaskWithAudit(taskId, userId)` function using `db.transaction()` that updates the task's `assigneeId` and inserts an `auditLogs` row so both succeed or roll back together.

---

## Mini-Project: Postgres Notes Repository

Build a standalone, type-safe PostgreSQL data-access module.

### Core (Required)
* Implement typed repository functions: `createNote`, `listNotes({ page, limit })`, `updateNote`, and `deleteNote`.
* Use parameterized Drizzle/Prisma queries throughout (no raw string interpolation).

### Stretch
* Add case-insensitive search (`ILIKE`) across note titles and bodies, plus a `tags` join table.

### Challenge
* Implement cursor-based pagination (`?cursor=...&limit=10`) returning `{ items, nextCursor }`.

---

## FlowBoard Squad Sprint — Day 1 of 4

* **Merge Conflict Practice:** With your squad, intentionally edit `src/routes/index.ts` on two separate branches and practice resolving the resulting conflict cleanly.
* **Sprint Goal:** Set up your squad repository, start Postgres with `docker-compose.yml`, create initial migrations for `boards`, `columns`, and `tasks`, and merge your first feature PRs with peer review and green CI.
