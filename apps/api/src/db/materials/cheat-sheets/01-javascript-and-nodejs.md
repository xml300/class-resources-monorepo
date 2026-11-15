# Cheat Sheet: Modern JavaScript & Node.js Essentials (Days 1–2)

### Variables & Control Flow
```js
const maxRetries = 3;          // Default choice: cannot reassign binding
let count = 0;                 // Reassignable binding
const status = count > 0 ? "active" : "empty"; // Ternary
```
* Always use strict equality `===` / `!==` (never `==`).
* Falsy values: `false`, `0`, `""`, `null`, `undefined`, `NaN` (everything else—including `[]` and `{}`—is truthy).

### Array Methods (Non-Mutating)
```js
const nums = [1, 2, 3, 4];
const doubled = nums.map((n) => n * 2);                // [2, 4, 6, 8]
const evens   = nums.filter((n) => n % 2 === 0);       // [2, 4]
const first   = nums.find((n) => n > 2);               // 3 (or undefined)
const total   = nums.reduce((sum, n) => sum + n, 0);   // 10
```

### ESM Modules & `package.json`
```json
{ "type": "module" }
```
```js
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
```

### Async/Await & Concurrency
```js
// Sequential (slow if independent)
const a = await fetchA();
const b = await fetchB();

// Concurrent (fast!)
const [user, posts] = await Promise.all([fetchUser(), fetchPosts()]);

// Partial failures allowed
const results = await Promise.allSettled([task1(), task2()]);
```

### Zero-Dependency `node:http` Server
```js
import http from "node:http";

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(3000);
```
