import { WebContainer, type WebContainerProcess } from "@webcontainer/api";
import type { ChallengeWorkspaceFile } from "./challengeParser";

export type RunnerStatus = "idle" | "booting" | "installing" | "running" | "ready" | "error";

export interface TestCaseResult {
  name: string;
  passed: boolean;
  durationMs?: number;
  error?: string;
}

export interface ExecutionResult {
  mode: "run" | "sample-test" | "attempt";
  exitCode: number;
  passed: boolean;
  stdout: string;
  tests: TestCaseResult[];
  passedCount: number;
  failedCount: number;
  durationMs: number;
  timedOut: boolean;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const WORKSPACE_DIR = "workspace";
const RUNS_DIR = `${WORKSPACE_DIR}/.runs`;
const DONE_PREFIX = "__WC_DONE__:";
const READY_TOKEN = "__WC_READY__";

let bootPromise: Promise<WebContainer> | null = null;
let installedDepsHash: string | null = null;
let lastPackageJson: string | null = null;
let runCounter = 0;

interface HotWorker {
  proc: WebContainerProcess;
  writer: WritableStreamDefaultWriter<string>;
  pending: Map<
    string,
    {
      resolve: () => void;
      reject: (err: Error) => void;
    }
  >;
}

interface WorkerResultFile {
  exitCode: number;
  stdout: string;
  tests?: TestCaseResult[];
  error?: string;
}

let workerPromise: Promise<HotWorker> | null = null;

// Strip ANSI escape codes from terminal output
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1B\[[0-9;]*[A-Za-z]/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, "");
}

export function isWebContainerSupported(): {
  supported: boolean;
  reason?: string;
} {
  if (typeof window === "undefined") {
    return { supported: false, reason: "Browser environment required." };
  }
  if (!window.crossOriginIsolated) {
    return {
      supported: false,
      reason:
        "Cross-Origin Isolation (COOP/COEP) is not enabled in this browser context. Reload the page or open it directly in a modern browser.",
    };
  }
  if (typeof SharedArrayBuffer === "undefined") {
    return {
      supported: false,
      reason: "SharedArrayBuffer is unavailable in this browser.",
    };
  }
  return { supported: true };
}

/**
 * Lightweight, repeatable `node:test`-compatible harness that runs in-process
 * inside the persistent Node.js worker without hitting Node's single-use root
 * test runner limitation.
 */
const TEST_HARNESS_SCRIPT = `
let queue = [];
let suitePrefix = [];
let beforeHooks = [];
let afterHooks = [];
let beforeEachHooks = [];
let afterEachHooks = [];

export function __resetHarness__() {
  queue = [];
  suitePrefix = [];
  beforeHooks = [];
  afterHooks = [];
  beforeEachHooks = [];
  afterEachHooks = [];
}

function registerTest(name, optsOrFn, maybeFn) {
  const fn = typeof optsOrFn === "function" ? optsOrFn : maybeFn;
  const opts = typeof optsOrFn === "object" && optsOrFn ? optsOrFn : {};
  if (typeof fn !== "function") return;
  const fullName = suitePrefix.length > 0 ? [...suitePrefix, name].join(" > ") : String(name);
  queue.push({ name: fullName, fn, skip: Boolean(opts.skip || opts.todo) });
}

export function test(name, optsOrFn, maybeFn) {
  registerTest(name, optsOrFn, maybeFn);
}
test.skip = (name) => {
  queue.push({ name: String(name), fn: () => {}, skip: true });
};
test.todo = test.skip;

export const it = test;

export function describe(name, fn) {
  suitePrefix.push(String(name));
  try {
    fn();
  } finally {
    suitePrefix.pop();
  }
}

export function before(fn) {
  beforeHooks.push(fn);
}
export function after(fn) {
  afterHooks.push(fn);
}
export function beforeEach(fn) {
  beforeEachHooks.push(fn);
}
export function afterEach(fn) {
  afterEachHooks.push(fn);
}

export async function __runAll__() {
  const results = [];
  for (const hook of beforeHooks) {
    await hook();
  }
  try {
    for (const item of queue) {
      if (item.skip) continue;
      const t0 = performance.now();
      const subtests = [];
      const ctx = {
        name: item.name,
        async test(subName, subOptsOrFn, subMaybeFn) {
          const subFn = typeof subOptsOrFn === "function" ? subOptsOrFn : subMaybeFn;
          if (typeof subFn !== "function") return;
          const st0 = performance.now();
          try {
            await subFn({ name: subName });
            subtests.push({
              name: item.name + " > " + subName,
              passed: true,
              durationMs: Math.round((performance.now() - st0) * 10) / 10,
            });
          } catch (err) {
            subtests.push({
              name: item.name + " > " + subName,
              passed: false,
              durationMs: Math.round((performance.now() - st0) * 10) / 10,
              error: err && err.message ? err.message : String(err),
            });
          }
        },
      };

      try {
        for (const hook of beforeEachHooks) await hook();
        await item.fn(ctx);
        for (const hook of afterEachHooks) await hook();
        if (subtests.length > 0) {
          results.push(...subtests);
        } else {
          results.push({
            name: item.name,
            passed: true,
            durationMs: Math.round((performance.now() - t0) * 10) / 10,
          });
        }
      } catch (err) {
        try {
          for (const hook of afterEachHooks) await hook();
        } catch {
          // ignore cleanup errors
        }
        if (subtests.length > 0) {
          results.push(...subtests);
        }
        results.push({
          name: item.name,
          passed: false,
          durationMs: Math.round((performance.now() - t0) * 10) / 10,
          error: err && err.message ? err.message : String(err),
        });
      }
    }
  } finally {
    for (const hook of afterHooks) {
      try {
        await hook();
      } catch {
        // ignore
      }
    }
  }
  return results;
}

export default test;
`;

/**
 * Persistent in-container Node.js worker daemon.
 * Uses file-based IPC (__job__.json / __result__.json) with tiny single-line
 * signals so WebContainer's 80-column PTY can never line-wrap or corrupt JSON.
 */
const WORKER_SCRIPT = `
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { __resetHarness__, __runAll__ } from "./__test_harness__.mjs";

const DONE_PREFIX = ${JSON.stringify(DONE_PREFIX)};
const READY_TOKEN = ${JSON.stringify(READY_TOKEN)};
const origStdoutWrite = process.stdout.write.bind(process.stdout);
const origStderrWrite = process.stderr.write.bind(process.stderr);
const origExit = process.exit.bind(process);
const baseCwd = process.cwd();
const seenJobs = new Set();

class ExitSignal extends Error {
  constructor(code) {
    super("EXIT_" + code);
    this.exitCode = code;
  }
}

async function handleRunId(runKey) {
  const absRunDir = path.resolve(baseCwd, ".runs", runKey);
  const jobFile = path.join(absRunDir, "__job__.json");
  const resultFile = path.join(absRunDir, "__result__.json");

  let job;
  try {
    job = JSON.parse(fs.readFileSync(jobFile, "utf8"));
  } catch (err) {
    fs.writeFileSync(
      resultFile,
      JSON.stringify({ exitCode: 1, stdout: "", error: "Failed to read job: " + String(err) }),
      "utf8"
    );
    origStdoutWrite("\\n" + DONE_PREFIX + runKey + "\\n");
    return;
  }

  const { mode, entryFilename, testFilename, cliArgs } = job;
  let output = "";

  const captureWrite = (chunk, encoding, cb) => {
    const text = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    output += text;
    if (typeof encoding === "function") encoding();
    else if (typeof cb === "function") cb();
    return true;
  };

  process.stdout.write = captureWrite;
  process.stderr.write = captureWrite;
  process.exitCode = 0;

  let resultPayload = { exitCode: 0, stdout: "" };

  try {
    process.chdir(absRunDir);

    if (mode === "run") {
      const entryPath = path.join(absRunDir, entryFilename);
      process.argv = ["node", entryPath, ...(cliArgs || [])];
      process.exit = (code = 0) => {
        throw new ExitSignal(Number(code) || 0);
      };

      let exitCode = 0;
      try {
        await import(pathToFileURL(entryPath).href);
        exitCode = Number(process.exitCode) || 0;
      } catch (err) {
        if (err instanceof ExitSignal) {
          exitCode = err.exitCode;
        } else {
          exitCode = 1;
          const msg = err && err.stack ? err.stack : String(err);
          output += (output ? "\\n" : "") + msg;
        }
      }
      resultPayload = { exitCode, stdout: output };
    } else {
      const testPath = path.join(absRunDir, testFilename);
      process.argv = ["node", testPath];
      __resetHarness__();

      let tests = [];
      let loadError;
      try {
        await import(pathToFileURL(testPath).href);
        tests = await __runAll__();
      } catch (err) {
        loadError = err && err.stack ? err.stack : String(err);
        output += (output ? "\\n" : "") + loadError;
      }

      const failed = Boolean(loadError) || tests.some((t) => !t.passed);
      resultPayload = {
        exitCode: failed ? 1 : 0,
        stdout: output,
        tests,
        error: loadError,
      };
    }
  } finally {
    process.stdout.write = origStdoutWrite;
    process.stderr.write = origStderrWrite;
    process.exit = origExit;
    process.exitCode = 0;
    try {
      process.chdir(baseCwd);
    } catch {
      // ignore
    }
  }

  fs.writeFileSync(resultFile, JSON.stringify(resultPayload), "utf8");
  origStdoutWrite("\\n" + DONE_PREFIX + runKey + "\\n");
}

let pendingChain = Promise.resolve();
let stdinBuf = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  stdinBuf += chunk;
  const parts = stdinBuf.split(/[\\r\\n]+/);
  stdinBuf = parts.pop() ?? "";
  for (const part of parts) {
    const token = part.trim();
    if (!/^r\\d+$/.test(token)) continue;
    if (seenJobs.has(token)) continue;
    seenJobs.add(token);
    pendingChain = pendingChain.then(() =>
      handleRunId(token).catch((err) => {
        const resultFile = path.resolve(baseCwd, ".runs", token, "__result__.json");
        try {
          fs.writeFileSync(
            resultFile,
            JSON.stringify({ exitCode: 1, stdout: "", error: String(err) }),
            "utf8"
          );
        } catch {
          // ignore
        }
        origStdoutWrite("\\n" + DONE_PREFIX + token + "\\n");
      })
    );
  }
});

origStdoutWrite("\\n" + READY_TOKEN + "\\n");
`;

async function ensureBaseWorkspace(wc: WebContainer): Promise<void> {
  await wc.fs.mkdir(RUNS_DIR, { recursive: true });
  await Promise.all([
    wc.fs.writeFile(`${WORKSPACE_DIR}/__test_harness__.mjs`, TEST_HARNESS_SCRIPT),
    wc.fs.writeFile(`${WORKSPACE_DIR}/__runner__.mjs`, WORKER_SCRIPT),
  ]);
  if (!lastPackageJson) {
    const defaultPkg = JSON.stringify(
      { name: "challenge-workspace", private: true, type: "module" },
      null,
      2
    );
    await wc.fs.writeFile(`${WORKSPACE_DIR}/package.json`, defaultPkg);
    lastPackageJson = defaultPkg;
  }
}

function resetWorker(reason?: string): void {
  const existing = workerPromise;
  workerPromise = null;
  if (existing) {
    existing
      .then((w) => {
        for (const [, p] of w.pending) {
          p.reject(new Error(reason || "Worker restarted"));
        }
        w.pending.clear();
        try {
          w.proc.kill();
        } catch {
          // ignore
        }
      })
      .catch(() => {});
  }
}

async function getHotWorker(wc: WebContainer): Promise<HotWorker> {
  if (workerPromise) return workerPromise;

  workerPromise = (async () => {
    await ensureBaseWorkspace(wc);
    const proc = await wc.spawn("node", ["__runner__.mjs"], {
      cwd: WORKSPACE_DIR,
      terminal: { cols: 200, rows: 30 },
    });
    const writer = proc.input.getWriter();
    const pending = new Map<
      string,
      {
        resolve: () => void;
        reject: (err: Error) => void;
      }
    >();

    let resolveReady: (() => void) | null = null;
    const readyPromise = new Promise<void>((res) => {
      resolveReady = res;
    });

    let buffer = "";
    void proc.output
      .pipeTo(
        new WritableStream({
          write(chunk) {
            buffer += chunk;
            const lines = buffer.split(/[\r\n]+/);
            buffer = lines.pop() ?? "";
            for (const rawLine of lines) {
              const line = stripAnsi(rawLine).trim();
              if (!line) continue;
              if (line.includes(READY_TOKEN)) {
                resolveReady?.();
                resolveReady = null;
                continue;
              }
              const doneIdx = line.indexOf(DONE_PREFIX);
              if (doneIdx !== -1) {
                const runKey = line
                  .slice(doneIdx + DONE_PREFIX.length)
                  .trim()
                  .split(/\s+/)[0];
                const entry = pending.get(runKey);
                if (entry) {
                  pending.delete(runKey);
                  entry.resolve();
                }
              }
            }
          },
        })
      )
      .catch(() => {});

    void proc.exit.then(() => {
      if (workerPromise) {
        for (const [, p] of pending) {
          p.reject(new Error("Node.js runner exited unexpectedly"));
        }
        pending.clear();
        workerPromise = null;
      }
    });

    await Promise.race([
      readyPromise,
      new Promise<void>((resolve) => setTimeout(resolve, 6000)),
    ]);

    return { proc, writer, pending };
  })().catch((err) => {
    workerPromise = null;
    throw err;
  });

  return workerPromise;
}

export async function getWebContainer(
  onStatus?: (status: RunnerStatus) => void
): Promise<WebContainer> {
  const support = isWebContainerSupported();
  if (!support.supported) {
    throw new Error(support.reason || "WebContainers is not supported.");
  }

  if (!bootPromise) {
    onStatus?.("booting");
    bootPromise = WebContainer.boot().catch((err) => {
      bootPromise = null;
      throw err;
    });
  }

  const instance = await bootPromise;
  await getHotWorker(instance);
  onStatus?.("ready");
  return instance;
}

/**
 * Pre-warms both the WebContainer VM and the persistent Node.js worker in the
 * background when a student opens an exercise, so the first Run/Test is instant.
 */
export function warmWebContainer(
  onStatus?: (status: RunnerStatus) => void
): void {
  const support = isWebContainerSupported();
  if (!support.supported) return;
  void getWebContainer(onStatus).catch(() => {
    // Surface errors only when the user explicitly clicks Run/Test
  });
}

function parseShellArgs(raw: string): string[] {
  const args: string[] = [];
  let i = 0;
  while (i < raw.length) {
    while (i < raw.length && /\s/.test(raw[i])) i++;
    if (i >= raw.length) break;
    let token = "";
    while (i < raw.length && !/\s/.test(raw[i])) {
      if (raw[i] === '"' || raw[i] === "'") {
        const q = raw[i++];
        while (i < raw.length && raw[i] !== q) {
          token += raw[i++];
        }
        if (i < raw.length) i++;
      } else {
        token += raw[i++];
      }
    }
    if (token) args.push(token);
  }
  return args;
}

/**
 * Parses Node's TAP output (`node --test --test-reporter=tap`) into structured test results.
 * Kept exported for compatibility/tests.
 */
export function parseTapOutput(rawOutput: string): {
  tests: TestCaseResult[];
  consoleOutput: string;
} {
  const clean = stripAnsi(rawOutput).replace(/\r\n/g, "\n");
  const lines = clean.split("\n");
  const tests: TestCaseResult[] = [];
  const consoleLines: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const testMatch = /^(\s*)(not ok|ok)\s+\d+\s*(?:-\s*)?(.*)$/.exec(line);
    if (testMatch) {
      const indent = testMatch[1];
      const passed = testMatch[2] === "ok";
      const name = testMatch[3].trim() || `Test ${tests.length + 1}`;

      let durationMs: number | undefined;
      const errorParts: string[] = [];

      let j = i + 1;
      if (j < lines.length && lines[j].trim() === "---") {
        j++;
        while (j < lines.length && lines[j].trim() !== "...") {
          const yamlLine = lines[j];
          const durMatch = /duration_ms:\s*([\d.]+)/.exec(yamlLine);
          if (durMatch) {
            durationMs = Math.round(Number(durMatch[1]) * 10) / 10;
          } else if (
            !passed &&
            !/^\s*(type|location|failureType|code|stack):/.test(yamlLine)
          ) {
            const trimmedYaml = yamlLine.trim();
            if (trimmedYaml && !trimmedYaml.startsWith("|-")) {
              errorParts.push(trimmedYaml);
            }
          }
          j++;
        }
        if (j < lines.length && lines[j].trim() === "...") {
          j++;
        }
      }

      const isSubtestContainer =
        indent.length === 0 &&
        i > 0 &&
        /^\s{4}(ok|not ok)\s+\d+/.test(lines[i - 1] ?? "");

      if (!isSubtestContainer) {
        tests.push({
          name,
          passed,
          durationMs,
          error:
            !passed && errorParts.length > 0
              ? errorParts.join("\n")
              : undefined,
        });
      }

      i = j;
      continue;
    }

    if (
      !/^TAP version \d+/.test(line) &&
      !/^\s*1\.\.\d+/.test(line) &&
      !/^\s*# (Subtest|tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)/.test(
        line
      )
    ) {
      consoleLines.push(line);
    }
    i++;
  }

  return {
    tests,
    consoleOutput: consoleLines.join("\n").trim(),
  };
}

async function writeFileEnsuringDir(
  wc: WebContainer,
  fullPath: string,
  content: string
): Promise<void> {
  const lastSlash = fullPath.lastIndexOf("/");
  if (lastSlash > 0) {
    const dir = fullPath.slice(0, lastSlash);
    await wc.fs.mkdir(dir, { recursive: true });
  }
  await wc.fs.writeFile(fullPath, content);
}

function rewriteNodeTestImports(testSource: string): string {
  return testSource.replace(
    /from\s+["']node:test["']/g,
    'from "../../__test_harness__.mjs"'
  );
}

export interface RunChallengeOptions {
  mode: "run" | "sample-test" | "attempt";
  entryFilename: string;
  code: string;
  testCode?: string | null;
  files: ChallengeWorkspaceFile[];
  cliArgs?: string;
  timeoutMs?: number;
  onStatus?: (status: RunnerStatus) => void;
  onOutputChunk?: (chunk: string) => void;
}

export async function runChallengeInWebContainer(
  options: RunChallengeOptions
): Promise<ExecutionResult> {
  const {
    mode,
    entryFilename,
    code,
    testCode,
    files,
    cliArgs = "",
    timeoutMs = DEFAULT_TIMEOUT_MS,
    onStatus,
    onOutputChunk,
  } = options;

  const startedAt = performance.now();

  try {
    const wc = await getWebContainer(onStatus);

    // Check if challenge specifies custom package.json dependencies
    const pkgFile = files.find((f) => f.path === "package.json");
    if (pkgFile && pkgFile.content !== lastPackageJson) {
      await wc.fs.writeFile(`${WORKSPACE_DIR}/package.json`, pkgFile.content);
      lastPackageJson = pkgFile.content;

      let depsSignature = "";
      try {
        const parsedPkg = JSON.parse(pkgFile.content) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const deps = {
          ...(parsedPkg.dependencies ?? {}),
          ...(parsedPkg.devDependencies ?? {}),
        };
        if (Object.keys(deps).length > 0) {
          depsSignature = JSON.stringify(deps);
        }
      } catch {
        // ignore invalid package.json
      }

      if (depsSignature && depsSignature !== installedDepsHash) {
        onStatus?.("installing");
        onOutputChunk?.("Installing npm dependencies...\n");
        const installProc = await wc.spawn(
          "npm",
          ["install", "--no-audit", "--no-fund"],
          { cwd: WORKSPACE_DIR }
        );
        installProc.output.pipeTo(
          new WritableStream({
            write(chunk) {
              onOutputChunk?.(stripAnsi(chunk));
            },
          })
        );
        const installExit = await installProc.exit;
        if (installExit !== 0) {
          onStatus?.("ready");
          return {
            mode,
            exitCode: installExit,
            passed: false,
            stdout: "Failed to install npm dependencies from package.json.",
            tests: [],
            passedCount: 0,
            failedCount: 0,
            durationMs: Math.round(performance.now() - startedAt),
            timedOut: false,
            error: "npm install failed",
          };
        }
        installedDepsHash = depsSignature;
      }
    }

    onStatus?.("running");

    // Write this run's files into a fresh isolated directory so ESM never serves stale cache
    const id = ++runCounter;
    const runKey = `r${id}`;
    const fullRunDir = `${RUNS_DIR}/${runKey}`;
    await wc.fs.mkdir(fullRunDir, { recursive: true });

    const isTs = entryFilename.endsWith(".ts") || entryFilename.endsWith(".mts");
    const testFilename = isTs ? "__challenge__.test.ts" : "__challenge__.test.mjs";

    const jobPayload = JSON.stringify({
      mode,
      entryFilename,
      testFilename,
      cliArgs: mode === "run" ? parseShellArgs(cliArgs) : [],
    });

    const writes: Promise<void>[] = [
      writeFileEnsuringDir(wc, `${fullRunDir}/${entryFilename}`, code),
      wc.fs.writeFile(`${fullRunDir}/__job__.json`, jobPayload),
    ];

    for (const f of files) {
      if (f.path === "package.json") continue;
      writes.push(writeFileEnsuringDir(wc, `${fullRunDir}/${f.path}`, f.content));
    }

    if ((mode === "sample-test" || mode === "attempt") && testCode) {
      writes.push(
        writeFileEnsuringDir(
          wc,
          `${fullRunDir}/${testFilename}`,
          rewriteNodeTestImports(testCode)
        )
      );
    }

    await Promise.all(writes);

    const worker = await getHotWorker(wc);

    let timedOut = false;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        timedOut = true;
        worker.pending.delete(runKey);
        resetWorker("Execution timed out");
        void getHotWorker(wc).catch(() => {});
        resolve();
      }, timeoutMs);

      worker.pending.set(runKey, {
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });

      void worker.writer.write(`${runKey}\n`).catch((err) => {
        clearTimeout(timer);
        worker.pending.delete(runKey);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });

    onStatus?.("ready");

    const durationMs = Math.round(performance.now() - startedAt);

    if (timedOut) {
      return {
        mode,
        exitCode: 124,
        passed: false,
        stdout: "",
        tests: [],
        passedCount: 0,
        failedCount: 0,
        durationMs,
        timedOut: true,
        error: `Execution timed out after ${Math.round(timeoutMs / 1000)}s (check for infinite loops or unclosed servers/timers).`,
      };
    }

    const rawResult = await wc.fs.readFile(`${fullRunDir}/__result__.json`, "utf-8");
    const response = JSON.parse(rawResult) as WorkerResultFile;

    // Clean up previous run directory in the background (non-blocking)
    if (id > 1) {
      void wc.fs
        .rm(`${RUNS_DIR}/r${id - 1}`, { recursive: true, force: true })
        .catch(() => {});
    }

    const cleanOutput = stripAnsi(response.stdout ?? "").trim();
    const exitCode = response.exitCode ?? 0;

    if (mode === "run") {
      return {
        mode,
        exitCode,
        passed: exitCode === 0,
        stdout: cleanOutput,
        tests: [],
        passedCount: 0,
        failedCount: 0,
        durationMs,
        timedOut: false,
        error:
          response.error ??
          (exitCode !== 0 ? `Process exited with code ${exitCode}` : undefined),
      };
    }

    const tests = response.tests ?? [];
    const passedCount = tests.filter((t) => t.passed).length;
    const failedCount = tests.filter((t) => !t.passed).length;
    const passed = exitCode === 0 && failedCount === 0 && tests.length > 0;

    return {
      mode,
      exitCode,
      passed,
      stdout: cleanOutput,
      tests,
      passedCount,
      failedCount,
      durationMs,
      timedOut: false,
      error:
        response.error ??
        (!passed && tests.length === 0
          ? cleanOutput || `Test runner exited with code ${exitCode}`
          : undefined),
    };
  } catch (err) {
    onStatus?.("error");
    return {
      mode,
      exitCode: 1,
      passed: false,
      stdout: "",
      tests: [],
      passedCount: 0,
      failedCount: 0,
      durationMs: Math.round(performance.now() - startedAt),
      timedOut: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to run code in WebContainer",
    };
  }
}
