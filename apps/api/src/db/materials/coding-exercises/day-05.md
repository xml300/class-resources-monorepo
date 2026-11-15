# Day 5: PostgreSQL & Type-Safe Data Access

## Coding Exercises

### Exercise 5.1 — Provision Neon & Verify Connection
Create a Neon PostgreSQL database, configure `DATABASE_URL` in `.env`, and run a quick script to confirm database connectivity.

### Exercise 5.2 — Schema & Migration
Model a one-to-many `users` → `tasks` schema where deleting a user removes their tasks, then generate and run your first migration.

### Exercise 5.3 — Idempotent Seed Script
Write an idempotent `seed.ts` script that inserts 2 sample users and 5 tasks so running it multiple times never fails or duplicates rows.

### Exercise 5.4 — Joins & Offset Pagination
Write a query `listTasksWithAssignee({ page, limit })` that joins `tasks` with `users`, returns the assignee's email without exposing `passwordHash`, and supports page-based pagination.

### Exercise 5.5 — Atomic Transaction
Write an atomic `assignTaskWithAudit(taskId, userId)` function that updates the task's `assigneeId` and inserts an `auditLogs` row so both succeed or roll back together.
