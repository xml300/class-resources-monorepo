# Day 5: PostgreSQL & Type-Safe Data Access

## Mini-Project: Postgres Notes Repository

Build a standalone, type-safe PostgreSQL data-access module.

### Core (Required)
* Implement typed repository functions: `createNote`, `listNotes({ page, limit })`, `updateNote`, and `deleteNote`.
* Use parameterized queries throughout with no raw string interpolation.

### Stretch
* Add case-insensitive search across note titles and bodies, plus a `tags` join table.

### Challenge
* Implement cursor-based pagination (`?cursor=...&limit=10`) returning `{ items, nextCursor }`.

---

## Class-Wide Collaborative Project — Day 1 of 4

* **Merge Conflict Practice:** Together as a class, intentionally edit `src/routes/index.ts` on two separate branches and practice resolving the resulting conflict cleanly.
* **Sprint Goal:** Set up the shared class repository, connect your Neon database, create initial migrations and feature slices, and merge your first feature PRs with peer review and green CI.
