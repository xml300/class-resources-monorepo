# Day 8: Real-Time WebSockets, External APIs & Background Jobs

## Mini-Project: Real-Time Ticker + Background Worker

Build a standalone background job that pushes live updates over WebSockets.

### Core (Required)
* Schedule a background job that runs every 10 seconds, generates or fetches a status update, and broadcasts `{ type: "ticker:update", payload }` to all connected WebSocket clients.

### Stretch
* Support channel subscriptions (`{ type: "subscribe", channel: "alerts" }`) so clients only receive events for channels they subscribed to.

### Challenge
* Implement heartbeat `ping`/`pong` checks to detect and close dead WebSocket connections automatically.

---

## Class-Wide Collaborative Project — Day 4 of 4

* **Sprint Goal:** Add real-time WebSocket updates and a scheduled background worker, connect the frontend UI, resolve any `package-lock.json` conflicts cleanly, tag `v1.0.0` on `main`, and demo the finished app.
