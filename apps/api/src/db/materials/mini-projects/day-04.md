# Day 4: Express.js + TypeScript Architecture

## Mini-Project: Typed Express Bookmark Manager

Build a layered Express + TypeScript REST API separating routing, request handling, and business logic.

### Core (Required)
* Implement `GET /bookmarks`, `POST /bookmarks`, `PATCH /bookmarks/:id`, and `DELETE /bookmarks/:id`.
* Validate `body` and `params` with schemas and infer TypeScript types from them.
* Keep route files free of business logic and forward all errors to your centralized error handler.

### Stretch
* Add structured request logging.
* Support filtering by `?tag=nodejs` and sorting by `?sort=newest`.

### Challenge
* Add an `x-api-key` middleware protecting mutating routes (`POST`, `PATCH`, `DELETE`) and a `GET /bookmarks/export.csv` endpoint.
