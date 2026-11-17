# Day 2: Node.js Ecosystem, Modules, Async JS & Streams

## Mini-Project: Streaming CSV & Log Analyzer CLI

Build a zero-dependency Node.js CLI tool using **only built-in Node.js modules** (`node:fs`, `node:fs/promises`, `node:stream`, `node:stream/promises`, `node:zlib`).

### Core (Required)
* Accept an input `.log` or `.csv` file path via `process.argv[2]`.
* Stream the file with `createReadStream()` + a custom `Transform` stream via `pipeline()` (no `readFile()` of the whole file).
* Compute summary stats (total lines, error count, warning count) and write them to `summary.json`.

### Stretch
* Redact sensitive tokens (`SECRET_KEY=...` or `token=...`) in a `Transform` stream and write a sanitized copy.
* Write malformed rows to `errors.log` and add a `--gzip` flag to compress the output using `node:zlib`.

### Challenge
* Accept a directory of log files, process all files concurrently using `Promise.allSettled()`, and print total elapsed time and peak memory usage (`process.memoryUsage().rss`).
