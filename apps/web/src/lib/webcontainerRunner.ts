import { WebContainer, type FileSystemTree } from "@webcontainer/api";
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

let bootPromise: Promise<WebContainer> | null = null;
let installedDepsHash: string | null = null;
let cachedNodeMajor: number | null = null;

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
  if (cachedNodeMajor === null) {
    try {
      const proc = await instance.spawn("node", ["-v"]);
      let ver = "";
      proc.output.pipeTo(
        new WritableStream({
          write(chunk) {
            ver += chunk;
          },
        })
      );
      await proc.exit;
      const match = /v(\d+)/.exec(ver.trim());
      if (match) cachedNodeMajor = Number(match[1]);
    } catch {
      cachedNodeMajor = 20;
    }
  }
  onStatus?.("ready");
  return instance;
}

function insertIntoTree(
  tree: FileSystemTree,
  filePath: string,
  contents: string
): void {
  const parts = filePath.split("/").filter(Boolean);
  let cursor = tree;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === parts.length - 1) {
      cursor[part] = { file: { contents } };
    } else {
      const existing = cursor[part];
      if (!existing || !("directory" in existing)) {
        cursor[part] = { directory: {} };
      }
      cursor = (cursor[part] as { directory: FileSystemTree }).directory;
    }
  }
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

    // Match top-level or indented TAP test assertions: "ok 1 - name" or "not ok 1 - name"
    const testMatch = /^(\s*)(not ok|ok)\s+\d+\s*(?:-\s*)?(.*)$/.exec(line);
    if (testMatch) {
      const indent = testMatch[1];
      const passed = testMatch[2] === "ok";
      const name = testMatch[3].trim() || `Test ${tests.length + 1}`;

      let durationMs: number | undefined;
      const errorParts: string[] = [];

      // Check for YAML diagnostic block (`  ---` ... `  ...`)
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

      // Skip parent suite summary lines when subtests exist (indentation heuristic: keep leaf tests)
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

    // Collect non-TAP lines (console.log / stderr) for the console output tab
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

    // Prepare workspace directory cleanly
    await wc.fs.mkdir(WORKSPACE_DIR, { recursive: true });

    // Remove old user files except node_modules so cached npm installs stay fast
    const existingEntries = await wc.fs.readdir(WORKSPACE_DIR);
    for (const entry of existingEntries) {
      if (entry === "node_modules") continue;
      await wc.fs.rm(`${WORKSPACE_DIR}/${entry}`, {
        recursive: true,
        force: true,
      });
    }

    // Build workspace FileSystemTree
    const tree: FileSystemTree = {};
    let hasPackageJson = false;
    let packageJsonContent = "";

    for (const f of files) {
      insertIntoTree(tree, f.path, f.content);
      if (f.path === "package.json") {
        hasPackageJson = true;
        packageJsonContent = f.content;
      }
    }

    if (!hasPackageJson) {
      packageJsonContent = JSON.stringify(
        {
          name: "challenge-workspace",
          private: true,
          type: "module",
        },
        null,
        2
      );
      insertIntoTree(tree, "package.json", packageJsonContent);
    }

    insertIntoTree(tree, entryFilename, code);

    const isTs = entryFilename.endsWith(".ts") || entryFilename.endsWith(".mts");
    const testFilename = isTs ? "__challenge__.test.ts" : "__challenge__.test.mjs";

    if ((mode === "sample-test" || mode === "attempt") && testCode) {
      insertIntoTree(tree, testFilename, testCode);
    }

    await wc.mount(tree, { mountPoint: WORKSPACE_DIR });

    // Check if package.json declares dependencies or if TypeScript needs tsx on Node < 22
    let needsNpmInstall = false;
    let depsSignature = "";
    try {
      const parsedPkg = JSON.parse(packageJsonContent) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = {
        ...(parsedPkg.dependencies ?? {}),
        ...(parsedPkg.devDependencies ?? {}),
      };
      const depKeys = Object.keys(deps).sort();
      if (depKeys.length > 0) {
        depsSignature = JSON.stringify(deps);
        needsNpmInstall = depsSignature !== installedDepsHash;
      }
    } catch {
      // ignore invalid package.json
    }

    if (needsNpmInstall) {
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

    onStatus?.("running");

    // Build node command
    const nodeArgs: string[] = [];
    if (isTs && (cachedNodeMajor ?? 20) >= 22) {
      nodeArgs.push("--experimental-strip-types");
    }

    if (mode === "run") {
      nodeArgs.push(entryFilename, ...parseShellArgs(cliArgs));
    } else {
      nodeArgs.push("--test", "--test-reporter=tap", testFilename);
    }

    const proc = await wc.spawn("node", nodeArgs, { cwd: WORKSPACE_DIR });

    let rawOutput = "";
    const outputDone = proc.output.pipeTo(
      new WritableStream({
        write(chunk) {
          rawOutput += chunk;
          if (mode === "run") {
            onOutputChunk?.(stripAnsi(chunk));
          }
        },
      })
    );

    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, timeoutMs);

    const exitCode = await proc.exit;
    clearTimeout(timeoutHandle);
    await outputDone.catch(() => {});

    onStatus?.("ready");

    const durationMs = Math.round(performance.now() - startedAt);
    const cleanOutput = stripAnsi(rawOutput).trim();

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
        error: exitCode !== 0 ? `Process exited with code ${exitCode}` : undefined,
      };
    }

    // Parse TAP test results
    const { tests, consoleOutput } = parseTapOutput(rawOutput);
    const passedCount = tests.filter((t) => t.passed).length;
    const failedCount = tests.filter((t) => !t.passed).length;
    const passed = exitCode === 0 && failedCount === 0 && (tests.length > 0 || exitCode === 0);

    return {
      mode,
      exitCode,
      passed,
      stdout: consoleOutput || cleanOutput,
      tests,
      passedCount,
      failedCount,
      durationMs,
      timedOut: false,
      error:
        !passed && tests.length === 0
          ? cleanOutput || `Test runner exited with code ${exitCode}`
          : undefined,
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
      error: err instanceof Error ? err.message : "Failed to run code in WebContainer",
    };
  }
}
