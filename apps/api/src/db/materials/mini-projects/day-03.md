# Day 3: TypeScript Foundations & Connecting Node to a Frontend

## Mini-Project: Strict-TS HTTP API + `day03-frontend/` Integration

Build a strict TypeScript HTTP backend and connect it to the pre-built `day03-frontend/` Vite app.

### Core (Required)
* Configure strict TypeScript with `dev` and `typecheck` npm scripts.
* Implement `GET /api/items`, `POST /api/items`, and `DELETE /api/items/:id` with proper `OPTIONS` preflight CORS handling.
* Connect `day03-frontend/` and verify you can create, list, and delete items in the browser with no CORS errors.

### Stretch
* Add `PATCH /api/items/:id` to toggle an item's completion status.
* Use a typed result pattern across all service functions so error responses are consistently typed.

### Challenge
* Add query-string filtering (`?q=search&status=done`) and pagination (`?page=1&limit=10`) with typed query-parameter parsing.
