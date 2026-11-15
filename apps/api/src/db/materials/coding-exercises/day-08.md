# Day 8: Real-Time WebSockets, External APIs & Background Jobs

## Coding Exercises

### Exercise 8.1 — `fetchJsonWithRetry<T>`
Write a typed `fetch` wrapper with a 5-second timeout, explicit error handling for non-2xx responses, and exponential backoff up to 3 retries on `5xx` or network failures.

### Exercise 8.2 — Typed WebSocket Broadcaster
Build a WebSocket server that broadcasts typed JSON updates to all connected clients.

### Exercise 8.3 — Validating Incoming WS Messages
Validate incoming client WebSocket messages, sending back `{ type: "error", message }` when a client sends invalid JSON or an unknown event.

### Exercise 8.4 — Scheduled Background Job
Create a scheduled background job that runs every minute, queries for overdue tasks, and logs a structured summary.

### Exercise 8.5 — File Upload Endpoint
Add a `POST /uploads` route with a 2MB file size limit and an allowlist for `.png`, `.jpg`, and `.pdf` files.
