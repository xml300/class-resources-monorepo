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
const RPC_PREFIX = "__WC_RPC__";

let bootPromise: Promise<WebContainer> | null = null;
let installedDepsHash: string | null = null;
let lastPackageJson: string | null = null;
let runCounter = 0;

interface HotWorker {
  proc: WebContainerProcess;
  writer: WritableStreamDefaultWriter<string>;
  pending: Map<
    number,
    {
      resolve: (payload: WorkerResponse) => void;
      reject: (err: Error) => void;
      onChunk?: (chunk: string) => void;
    }
  >;
}

interface WorkerResponse {
  id: number;
  type: "ready" | "chunk" | "result";
  chunk?: string;
  exitCode?: number;
  stdout?: string;
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
 * Persistent in-container Node.js runner script.
 * Keeps V8 & ESM warm so each Run / Test / Attempt executes in ~10-50ms
 * instead of paying a ~2-3s Node.js process spawn penalty on every click.
 */
const WORKER_SCRIPT = `
import readline from "node:readline";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { run as runNodeTest } from "node:test";

const RPC_PREFIX = ${JSON.stringify(RPC_PREFIX)};
const origStdoutWrite = process.stdout.write.bind(process.stdout);
const origStderrWrite = process.stderr.write.bind(process.stderr);
const origExit = process.exit.bind(process);
const baseCwd = process.cwd();

function sendRpc(obj) {
  origStdoutWrite(RPC_PREFIX + JSON.stringify(obj) + "\\n");
}

class ExitSignal extends Error {
  constructor(code) {
    super("EXIT_" + code);
    this.exitCode = code;
  }
}

async function handleJob(job) {
  const { id, mode, runDir, entryFilename, testFilename, cliArgs } = job;
  const absRunDir = path.resolve(baseCwd, runDir);
  let output = "";

  const captureWrite = (chunk, encoding, cb) => {
    const text = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    output += text;
    if (mode === "run") {
      sendRpc({ id, type: "chunk", chunk: text });
    }
    if (typeof encoding === "function") encoding();
    else if (typeof cb === "function") cb();
    return true;
  };

  process.stdout.write = captureWrite;
  process.stderr.write = captureWrite;
  process.exitCode = 0;

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
      sendRpc({ id, type: "result", exitCode, stdout: output });
      return;
    }

    // Test / Attempt mode via programmatic node:test (in-process, isolation: "none")
    const testPath = path.join(absRunDir, testFilename);
    process.argv = ["node", testPath];
    const tests = [];
    let hasError = false;

    try {
      const stream = runNodeTest({
        files: [testPath],
        isolation: "none",
      });

      for await (const ev of stream) {
        if (ev.type === "test:stdout" || ev.type === "test:stderr") {
          if (ev.data && ev.data.message) {
            output += ev.data.message;
          }
        } else if (ev.type === "test:pass" || ev.type === "test:fail") {
          const d = ev.data || {};
          // Skip parent suite containers; keep leaf tests and file-level load failures
          if (d.details && d.details.type === "suite") continue;
          const passed = ev.type === "test:pass";
          if (!passed) hasError = true;
          const errObj = d.details && d.details.error;
          const errCause = errObj && errObj.cause ? errObj.cause : errObj;
          const errMsg = !passed && errCause
            ? (errCause.message || String(errCause))
            : undefined;
          const durationMs =
            d.details && typeof d.details.duration_ms === "number"
              ? Math.round(d.details.duration_ms * 10) / 10
              : undefined;
          tests.push({
            name: d.name || ("Test " + (tests.length + 1)),
            passed,
            durationMs,
            error: errMsg,
          });
        }
      }
    } catch (err) {
      hasError = true;
      const msg = err && err.stack ? err.stack : String(err);
      output += (output ? "\\n" : "") + msg;
    }

    // Filter out top-level file wrapper entry if individual tests were recorded
    const leafTests =
      tests.length > 1
        ? tests.filter((t) => t.name !== testPath && !t.name.endsWith("/" + testFilename))
        : tests;

    const exitCode = hasError || leafTests.some((t) => !t.passed) ? 1 : 0;
    sendRpc({ id, type: "result", exitCode, stdout: output, tests: leafTests });
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
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
sendRpc({ id: 0, type: "ready" });

rl.on("line", (line) => {
  if (!line.trim()) return;
  let job;
  try {
    job = JSON.parse(line);
  } catch {
    return;
  }
  handleJob(job).catch((err) => {
    sendRpc({
      id: job.id,
      type: "result",
      exitCode: 1,
      stdout: "",
      error: err && err.message ? err.message : String(err),
    });
  });
});
`;

async function ensureBaseWorkspace(wc: WebContainer): Promise<void> {
  await wc.fs.mkdir(RUNS_DIR, { recursive: true });
  await wc.fs.writeFile(`${WORKSPACE_DIR}/__runner__.mjs`, WORKER_SCRIPT);
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
    });
    const writer = proc.input.getWriter();
    const pending = new Map<
      number,
      {
        resolve: (payload: WorkerResponse) => void;
        reject: (err: Error) => void;
        onChunk?: (chunk: string) => void;
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
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const cleanLine = stripAnsi(line);
              const idx = cleanLine.indexOf(RPC_PREFIX);
              if (idx === -1) continue;
              try {
                const msg = JSON.parse(
                  cleanLine.slice(idx + RPC_PREFIX.length)
                ) as WorkerResponse & { type: string };
                if (msg.type === "ready") {
                  resolveReady?.();
                  resolveReady = null;
                  continue;
                }
                const entry = pending.get(msg.id);
                if (!entry) continue;
                if (msg.type === "chunk" && msg.chunk) {
                  entry.onChunk?.(stripAnsi(msg.chunk));
                } else if (msg.type === "result") {
                  pending.delete(msg.id);
                  entry.resolve(msg);
                }
              } catch {
                // ignore malformed non-RPC line
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
      new Promise<void>((resolve) => setTimeout(resolve, 4000)),
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
    const relRunDir = `.runs/r${id}`;
    const fullRunDir = `${WORKSPACE_DIR}/${relRunDir}`;
    await wc.fs.mkdir(fullRunDir, { recursive: true });

    const isTs = entryFilename.endsWith(".ts") || entryFilename.endsWith(".mts");
    const testFilename = isTs ? "__challenge__.test.ts" : "__challenge__.test.mjs";

    const writes: Promise<void>[] = [
      writeFileEnsuringDir(wc, `${fullRunDir}/${entryFilename}`, code),
    ];

    for (const f of files) {
      if (f.path === "package.json") continue;
      writes.push(writeFileEnsuringDir(wc, `${fullRunDir}/${f.path}`, f.content));
    }

    if ((mode === "sample-test" || mode === "attempt") && testCode) {
      writes.push(
        writeFileEnsuringDir(wc, `${fullRunDir}/${testFilename}`, testCode)
      );
    }

    await Promise.all(writes);

    const worker = await getHotWorker(wc);

    let timedOut = false;
    const response = await new Promise<WorkerResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        timedOut = true;
        worker.pending.delete(id);
        resetWorker("Execution timed out");
        // Re-warm fresh worker in background for next click
        void getHotWorker(wc).catch(() => {});
        resolve({ id, type: "result", exitCode: 124, stdout: "" });
      }, timeoutMs);

      worker.pending.set(id, {
        resolve: (payload) => {
          clearTimeout(timer);
          resolve(payload);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
        onChunk: onOutputChunk,
      });

      const payload = JSON.stringify({
        id,
        mode,
        runDir: relRunDir,
        entryFilename,
        testFilename,
        cliArgs: mode === "run" ? parseShellArgs(cliArgs) : [],
      });

      void worker.writer.write(payload + "\n").catch((err) => {
        clearTimeout(timer);
        worker.pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });

    // Clean up previous run directory in the background (non-blocking)
    if (id > 1) {
      void wc.fs
        .rm(`${WORKSPACE_DIR}/.runs/r${id - 1}`, {
          recursive: true,
          force: true,
        })
        .catch(() => {});
    }

    onStatus?.("ready");

    const durationMs = Math.round(performance.now() - startedAt);
    const cleanOutput = stripAnsi(response.stdout ?? "").trim();

    if (timedOut) {
      return {
        mode,
        exitCode: 124,
        passed: false,
        stdout: cleanOutput,
        tests: [],
        passedCount: 0,
        failedCount: 0,
        durationMs,
        timedOut: true,
        error: `Execution timed out after ${Math.round(timeoutMs / 1000)}s (check for infinite loops or unclosed servers/timers).`,
      };
    }

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
