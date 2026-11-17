# Day 3 Recap: Day 1 & Day 2 Deep-Dive Exercises

These exercises revisit core JavaScript and Node.js concepts from Days 1 and 2 in greater depth—covering immutability, nullish coalescing, closures, defensive file I/O, `async/await` pitfalls, event loop ordering, resilient concurrency, ESM paths, and streams—before applying them in TypeScript and `node:http`.

---

## Exercise R.1 — Immutable Task Store & `.reduce()` Summary (Day 1 Deep Dive)
Given an array of task objects `{ id, title, category, minutes, done }`:
* Write `toggleTask(tasks, id)` so it returns a **new array** with the matching task's `done` flipped—without mutating the original array or task object.
* Write `summarizeByCategory(tasks)` using `.reduce()` to return an object mapping each `category` to `{ count, totalMinutes, completedCount }`.
* Write a quick assertion check verifying that the original `tasks` array is unchanged after calling `toggleTask`.

---

## Exercise R.2 — Defensive JSON File Loader (`ENOENT` vs. Corrupt JSON) (Day 1 Deep Dive)
Write an ESM module `safe-store.mjs` with `loadRecords(filePath)` and `saveRecords(filePath, records)`:
* In `loadRecords`, use `readFile(filePath, 'utf8')` from `node:fs/promises`.
* If the file does not exist (`err.code === 'ENOENT'`), return `[]` instead of crashing.
* If the file exists but contains invalid JSON (`SyntaxError`), throw a descriptive `Error` with the filename and set `process.exitCode = 1` in your caller—do **not** silently return `[]` on corrupt data.

---

## Exercise R.3 — Safe Number Parsing & `NaN` Edge Cases (Day 1 Deep Dive)
Write a helper `parsePositiveInt(raw)` that safely converts CLI arguments or string inputs into positive integers:
* Reject empty/whitespace strings (`""`, `"   "`) — note that `Number("")` returns `0`!
* Reject partial numbers like `"12px"` — note that `parseInt("12px", 10)` silently returns `12`!
* Use `Number(raw)` + `Number.isInteger(n)` (and `Number.isNaN(n)`), returning `null` for invalid inputs.
* Test with: `"42"`, `"0"`, `"-5"`, `"3.14"`, `"12px"`, `""`, and `"abc"`.

---

## Exercise R.4 — Closures, Rest Destructuring & Shallow Copy Trap (Day 1 Deep Dive)
* Write a closure factory `createRateLimiter(maxCalls)` that returns a function `attempt(label)` which tracks how many times it has been called and returns `true` for the first `maxCalls` calls and `false` afterward.
* Write `sanitizeUser(user)` using rest destructuring (`const { passwordHash, ...safe } = user`) to strip `passwordHash`, and ensure any nested `roles` array is cloned (`[...user.roles]`) so mutating the returned object does not mutate `user`.

---

## Exercise R.5 — Event Loop & Microtask Execution Trace (Day 2 Deep Dive)
Predict the exact output order of the following snippet **before** running it, then run it with `node` and explain why each line prints in that order:

```js
console.log('1: sync start');

setTimeout(() => {
  console.log('2: timeout 0');
  Promise.resolve().then(() => console.log('3: promise inside timeout'));
}, 0);

Promise.resolve().then(() => {
  console.log('4: promise 1');
  queueMicrotask(() => console.log('5: microtask inside promise'));
});

queueMicrotask(() => console.log('6: top-level microtask'));

console.log('7: sync end');
```

---

## Exercise R.6 — Spot & Fix the `async/await` Bugs (Day 2 Deep Dive)
Fix two subtle async bugs in a `fetchAllReports(ids)` function:
1. **Accidental serialization:** Replace a `for (const id of ids) { results.push(await fetchReport(id)); }` loop with `Promise.all(ids.map(...))` and verify total time drops from `N * delay` to `~delay`.
2. **`return` vs. `return await` in `try/catch`:** Demonstrate why `try { return failingAsync(); } catch (err) { ... }` skips the `catch` block, and fix it with `return await`.

---

## Exercise R.7 — Resilient Batch Fetcher with Timeout Guard (Day 2 Deep Dive)
Combine `Promise.race` and `Promise.allSettled`:
* Implement `withTimeout(promise, ms)` that rejects with `new Error('Timed out')` if `promise` does not settle within `ms` milliseconds (and clears the timer when `promise` settles first).
* Given 5 mock async jobs (varying from `100ms` to `900ms`, with 1 that throws), run all 5 concurrently with a `400ms` timeout per job using `Promise.allSettled`.
* Return `{ succeeded: [...], timedOut: [...], failed: [...] }`.

---

## Exercise R.8 — `Buffer` Byte-Length & Chunk Assembly (Day 2 Deep Dive)
* Compare `text.length` (UTF-16 code units) vs. `Buffer.byteLength(text, 'utf8')` on a string containing multi-byte characters (e.g., `"Node 🚀 café"`), and explain why `Content-Length` headers and payload size limits must measure **bytes**, not `.length`.
* Split a `Buffer` containing multi-byte UTF-8 text into two halves at a byte boundary inside `"🚀"`, then show why calling `.toString('utf8')` on each chunk separately produces garbled characters (``), whereas `Buffer.concat([chunk1, chunk2]).toString('utf8')` decodes cleanly.

---

## Exercise R.9 — Custom `Transform` Stream: Line-Safe CSV Filter (Day 2 Deep Dive)
Using `createReadStream`, `createWriteStream`, `Transform`, and `pipeline` from `node:stream/promises`:
* Stream a CSV file (`events.csv`) chunk-by-chunk, buffering any incomplete trailing line across chunks (`this.remainder`) so lines split across `Buffer` boundaries are never corrupted.
* Keep only rows where `level === 'ERROR'`, transform them to uppercase, and write them to `errors-only.csv`.
* Track and print the total number of lines scanned vs. error lines written without loading the entire file into memory.
