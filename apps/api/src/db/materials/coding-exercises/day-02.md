# Day 2: Node.js Ecosystem, Modules, Async JS & Streams

## Coding Exercises

### Exercise 2.1 — ES Module Split
Convert a single script into a multi-file ES module project with `math.js` exporting `add` and `average`, and `index.js` importing and running them.

### Exercise 2.2 — Sequential vs. Concurrent Benchmark
Given a mock `fetchPrice(id)` function that takes 300ms, refactor a sequential loop over 5 IDs to run concurrently and log the total elapsed time before and after.

### Exercise 2.3 — Resilient Batch Fetcher
Call an async `checkService(url)` function across 4 URLs where 1 URL rejects, returning `{ succeeded: [...], failed: [...] }` without crashing the batch.

### Exercise 2.4 — Streaming Line Counter
Count error lines in a large log file without loading the entire file into memory.

### Exercise 2.5 — CommonJS to ESM Migration
Convert the following `legacy.cjs` script into an ES module project (`"type": "module"` in `package.json`):

```js
// legacy.cjs
const fs = require('fs');

function loadUsers() {
  const raw = fs.readFileSync('users.json', 'utf8');
  return JSON.parse(raw);
}

function getActiveUsers() {
  const users = loadUsers();
  return users.filter((u) => u.active);
}

module.exports = { loadUsers, getActiveUsers };
```

* Replace `require` / `module.exports` with `import` / `export` in `users.js` (with `"type": "module"` in `package.json`).
* Import `readFile` using the `node:` prefix (`import { readFile } from 'node:fs/promises';`).
* Convert `loadUsers` and `getActiveUsers` to `async` functions using `await readFile('users.json', 'utf8')`.
* Create an `index.js` that imports `getActiveUsers` and logs the active users from a sample `users.json` file.

### Exercise 2.6 — Promisified `delay` & Retry Helper
Write an async `delay(ms)` helper using `new Promise` and `setTimeout`. Then write `retry(fn, attempts)` that calls an async function `fn` up to `attempts` times, waiting `200ms` between failures before rethrowing the final error.
* Test it with a mock async function that fails twice and succeeds on the third attempt.

### Exercise 2.7 — Timeout Guard with `Promise.race`
Write a `withTimeout(promise, ms)` function that races `promise` against a timer that rejects with `new Error("Operation timed out")` after `ms` milliseconds.
* Test it with a fast task (`100ms` with a `500ms` limit → resolves) and a slow task (`800ms` with a `300ms` limit → rejects).

### Exercise 2.8 — Concurrent JSON Config Merger (`Promise.all`)
Write a script `merge-configs.mjs` that reads `defaults.json` and `overrides.json` concurrently using `Promise.all` and `node:fs/promises`, merges them into a single object (with `overrides` taking precedence), and writes the result to `config.json` formatted with 2-space indentation.

### Exercise 2.9 — Concurrent Directory Size Report (`readdir` + `stat` + `Promise.all`)
Write a script `dir-sizes.mjs` that accepts a folder path from `process.argv[2]` (defaulting to `.`):
* Read the directory entries using `readdir(dirPath, { withFileTypes: true })` from `node:fs/promises`.
* Filter to files only (`entry.isFile()`), then fetch their sizes concurrently with `Promise.all` and `stat()`.
* Print each filename and its size in bytes/KB sorted from largest to smallest, plus the total combined size.

### Exercise 2.10 — Live Folder Watcher (`fs/promises` `watch`)
Write a script `watch-dir.mjs` that monitors a `./watched` folder for changes using `watch` from `node:fs/promises`:
* Use `for await (const event of watch('./watched'))` to listen for file events.
* Log a timestamp, `event.eventType` (`rename` or `change`), and `event.filename` whenever a file is created, edited, or deleted.
* **Bonus:** Debounce rapid duplicate events for the same file within `100ms` so a single save only logs once.

### Exercise 2.11 — Custom `Transform` Stream: Log Redactor
Use `Transform` from `node:stream` and `pipeline()` to read `app.log` chunk-by-chunk, replace any occurrences of `SECRET_KEY=\w+` with `SECRET_KEY=[REDACTED]`, and write the sanitized output to `app.sanitized.log`.

### Exercise 2.12 — Event Loop Order Challenge
Without running the code first, predict the exact console output order of a snippet combining synchronous `console.log`, `setTimeout(..., 0)`, `Promise.resolve().then(...)`, and `queueMicrotask(...)`. Then run it with `node` and write a 1–2 sentence comment explaining why each line printed when it did.
