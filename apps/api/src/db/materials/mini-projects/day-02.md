# Day 2: Node.js Ecosystem, Modules, Async JS & HTTP Fundamentals

## Mini-Project: Zero-Dependency URL Shortener HTTP API

Build a REST-style JSON API using **only built-in Node.js modules**.

### Core (Required)
* `GET /links` — returns all saved short links from `links.json`.
* `POST /links` — accepts `{ url }`, generates a 6-character code, saves it to `links.json`, and returns `201`.
* `GET /:code` — responds with a `302` redirect to the original URL, or `404` JSON if the code does not exist.

### Stretch
* Track a `clicks` count for each link and expose `GET /links/:code/stats`.
* Validate that `url` begins with `http://` or `https://` and return `400` if invalid.

### Challenge
* Add a `GET /export` route that streams `links.json` as a gzip-compressed response.
