import {
  type FileSystemTree,
  type WebContainer,
  type WebContainerProcess,
} from "@webcontainer/api";
import { bootSharedWebContainer, stripAnsi } from "./webcontainerRunner";

export type ProjectRunnerPhase =
  | "idle"
  | "booting"
  | "mounting"
  | "installing"
  | "running"
  | "server-ready"
  | "exited"
  | "error";

export interface ProjectRunCallbacks {
  onPhaseChange: (phase: ProjectRunnerPhase, detail?: string) => void;
  onOutput: (chunk: string) => void;
  onServerReady: (url: string, port: number) => void;
  onExit: (exitCode: number) => void;
}

const PROJECT_DIR = "project";

const STATIC_SERVER_SCRIPT = `
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let rel = urlPath === "/" ? "/index.html" : urlPath;
  let fullPath = path.join(rootDir, rel);
  if (!fullPath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    fullPath = path.join(fullPath, "index.html");
  }
  if (!fs.existsSync(fullPath)) {
    const publicFallback = path.join(rootDir, "public", rel);
    if (fs.existsSync(publicFallback) && fs.statSync(publicFallback).isFile()) {
      fullPath = publicFallback;
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found: " + rel);
      return;
    }
  }
  const ext = path.extname(fullPath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(fullPath).pipe(res);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log("Static preview server running at http://localhost:" + port);
});
`;

let mountedOnce = false;
let activeProcess: WebContainerProcess | null = null;
let activeServerListenerUnsub: (() => void) | null = null;
let lastInstalledDepsSignature: string | null = null;

async function getProjectContainer(): Promise<WebContainer> {
  return bootSharedWebContainer();
}

function buildFileSystemTree(
  files: Array<{ path: string; content: string }>
): FileSystemTree {
  const root: FileSystemTree = {};
  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    if (segments.length === 0) continue;
    let cursor: FileSystemTree = root;
    for (let i = 0; i < segments.length - 1; i++) {
      const dirName = segments[i];
      const existing = cursor[dirName];
      if (!existing || !("directory" in existing)) {
        cursor[dirName] = { directory: {} };
      }
      cursor = (cursor[dirName] as { directory: FileSystemTree }).directory;
    }
    const fileName = segments[segments.length - 1];
    cursor[fileName] = {
      file: { contents: file.content },
    };
  }
  return root;
}

function getPackageDepsSignature(
  files: Array<{ path: string; content: string }>
): string | null {
  const pkg = files.find((f) => f.path === "package.json");
  if (!pkg) return null;
  try {
    const parsed = JSON.parse(pkg.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = parsed.dependencies ?? {};
    const devDeps = parsed.devDependencies ?? {};
    if (Object.keys(deps).length === 0 && Object.keys(devDeps).length === 0) {
      return null;
    }
    return JSON.stringify({ deps, devDeps });
  } catch {
    return null;
  }
}

function splitCommand(command: string): [string, string[]] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  const [cmd = "node", ...args] = tokens;
  return [cmd, args];
}

export async function stopProjectExecution(): Promise<void> {
  if (activeServerListenerUnsub) {
    activeServerListenerUnsub();
    activeServerListenerUnsub = null;
  }
  if (activeProcess) {
    try {
      activeProcess.kill();
    } catch {
      // Ignore already exited process
    }
    activeProcess = null;
  }
}

export async function updateMountedProjectFile(
  relativePath: string,
  content: string
): Promise<void> {
  if (!mountedOnce) return;
  try {
    const wc = await getProjectContainer();
    await wc.fs.writeFile(`${PROJECT_DIR}/${relativePath}`, content);
  } catch {
    // Ignore if container isn't mounted yet
  }
}

export async function runProjectInWebContainer(
  files: Array<{ path: string; content: string }>,
  runCommand: string,
  callbacks: ProjectRunCallbacks
): Promise<void> {
  await stopProjectExecution();

  callbacks.onPhaseChange("booting", "Starting in-browser Node runtime...");
  const wc = await getProjectContainer();

  callbacks.onPhaseChange("mounting", "Mounting project files...");
  const depsSignature = getPackageDepsSignature(files);
  const canReuseNodeModules =
    depsSignature !== null && depsSignature === lastInstalledDepsSignature;

  try {
    const entries = await wc.fs.readdir(PROJECT_DIR);
    for (const entry of entries) {
      if (canReuseNodeModules && entry === "node_modules") continue;
      await wc.fs.rm(`${PROJECT_DIR}/${entry}`, {
        recursive: true,
        force: true,
      });
    }
  } catch {
    await wc.fs.mkdir(PROJECT_DIR, { recursive: true });
  }

  const tree = buildFileSystemTree(files);
  await wc.mount(tree, { mountPoint: PROJECT_DIR });
  mountedOnce = true;

  if (depsSignature && !canReuseNodeModules) {
    callbacks.onPhaseChange(
      "installing",
      "Installing dependencies (npm install)..."
    );
    callbacks.onOutput("$ npm install\n");
    const installProc = await wc.spawn("npm", ["install"], {
      cwd: PROJECT_DIR,
    });
    activeProcess = installProc;

    installProc.output.pipeTo(
      new WritableStream({
        write(data) {
          callbacks.onOutput(stripAnsi(data));
        },
      })
    );

    const installExit = await installProc.exit;
    activeProcess = null;
    if (installExit !== 0) {
      callbacks.onPhaseChange("error", `npm install failed (exit ${installExit})`);
      callbacks.onExit(installExit);
      return;
    }
    lastInstalledDepsSignature = depsSignature;
  }

  activeServerListenerUnsub = wc.on("server-ready", (port, url) => {
    callbacks.onPhaseChange("server-ready", `Listening on port ${port}`);
    callbacks.onServerReady(url, port);
  });

  const trimmedCmd = runCommand.trim();
  let cmd: string;
  let args: string[];

  if (
    trimmedCmd === "static" ||
    (!trimmedCmd && files.some((f) => f.path === "index.html"))
  ) {
    await wc.fs.writeFile(
      `${PROJECT_DIR}/__static_preview_server__.mjs`,
      STATIC_SERVER_SCRIPT
    );
    cmd = "node";
    args = ["__static_preview_server__.mjs"];
    callbacks.onOutput("$ starting static preview server...\n");
  } else {
    [cmd, args] = splitCommand(trimmedCmd || "npm start");
    callbacks.onOutput(`$ ${trimmedCmd || "npm start"}\n`);
  }

  callbacks.onPhaseChange("running", `Running "${trimmedCmd || "static"}"...`);
  const proc = await wc.spawn(cmd, args, { cwd: PROJECT_DIR });
  activeProcess = proc;

  proc.output.pipeTo(
    new WritableStream({
      write(data) {
        callbacks.onOutput(stripAnsi(data));
      },
    })
  );

  const exitCode = await proc.exit;
  if (activeProcess === proc) {
    activeProcess = null;
  }
  callbacks.onPhaseChange(
    exitCode === 0 ? "exited" : "error",
    `Process exited with code ${exitCode}`
  );
  callbacks.onExit(exitCode);
}

export interface ApiPreviewRequest {
  port: number;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ApiPreviewResponse {
  status: number;
  statusText: string;
  durationMs: number;
  sizeBytes: number;
  headers: Record<string, string>;
  body: string;
}

const API_CLIENT_SCRIPT_PATH = "__api_preview_client__.mjs";
const API_CLIENT_START_MARKER = "__API_PREVIEW_JSON_START__";
const API_CLIENT_END_MARKER = "__API_PREVIEW_JSON_END__";

const API_CLIENT_SCRIPT = `
import http from "node:http";
import fs from "node:fs";

const payloadPath = process.argv[2];
const reqSpec = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
const start = Date.now();

const normalizedPath = reqSpec.path.startsWith("/") ? reqSpec.path : "/" + reqSpec.path;
const method = (reqSpec.method || "GET").toUpperCase();
const headers = { ...(reqSpec.headers || {}) };
const hasBody =
  reqSpec.body !== undefined &&
  reqSpec.body !== null &&
  reqSpec.body !== "" &&
  method !== "GET" &&
  method !== "HEAD";

const bodyBuffer = hasBody ? Buffer.from(reqSpec.body, "utf8") : null;
if (bodyBuffer && !Object.keys(headers).some((k) => k.toLowerCase() === "content-length")) {
  headers["Content-Length"] = String(bodyBuffer.length);
}

const req = http.request(
  {
    hostname: "127.0.0.1",
    port: reqSpec.port,
    path: normalizedPath,
    method,
    headers,
    timeout: 15000,
  },
  (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => {
      const buf = Buffer.concat(chunks);
      const resHeaders = {};
      for (const [k, v] of Object.entries(res.headers)) {
        resHeaders[k] = Array.isArray(v) ? v.join(", ") : String(v ?? "");
      }
      const result = {
        status: res.statusCode || 0,
        statusText: res.statusMessage || "",
        durationMs: Date.now() - start,
        sizeBytes: buf.length,
        headers: resHeaders,
        body: buf.toString("utf8"),
      };
      process.stdout.write("${API_CLIENT_START_MARKER}" + JSON.stringify(result) + "${API_CLIENT_END_MARKER}\\n");
    });
  }
);

req.on("timeout", () => {
  req.destroy(new Error("Request timed out after 15s"));
});

req.on("error", (err) => {
  const result = {
    error: err.message || "Request failed",
    durationMs: Date.now() - start,
  };
  process.stdout.write("${API_CLIENT_START_MARKER}" + JSON.stringify(result) + "${API_CLIENT_END_MARKER}\\n");
});

if (bodyBuffer) {
  req.write(bodyBuffer);
}
req.end();
`;

let apiClientScriptWritten = false;
let apiRequestCounter = 0;

/**
 * Executes an HTTP request directly inside the WebContainer against
 * `http://127.0.0.1:<port><path>`, bypassing browser CORS/COEP restrictions
 * so any Express/Fastify/Hono/Node API can be tested with all HTTP methods.
 */
export async function sendApiRequestInWebContainer(
  req: ApiPreviewRequest
): Promise<ApiPreviewResponse> {
  const wc = await getProjectContainer();

  if (!apiClientScriptWritten) {
    await wc.fs.writeFile(API_CLIENT_SCRIPT_PATH, API_CLIENT_SCRIPT);
    apiClientScriptWritten = true;
  }

  const reqFile = `__api_req_${Date.now()}_${++apiRequestCounter}.json`;
  await wc.fs.writeFile(reqFile, JSON.stringify(req));

  try {
    const proc = await wc.spawn("node", [API_CLIENT_SCRIPT_PATH, reqFile]);
    let rawOutput = "";
    const reader = proc.output.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) rawOutput += value;
    }
    await proc.exit;

    const startIdx = rawOutput.indexOf(API_CLIENT_START_MARKER);
    const endIdx = rawOutput.indexOf(API_CLIENT_END_MARKER);
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      throw new Error(
        stripAnsi(rawOutput).trim() || "No response received from API server"
      );
    }

    const jsonStr = rawOutput.slice(
      startIdx + API_CLIENT_START_MARKER.length,
      endIdx
    );
    const parsed = JSON.parse(jsonStr) as
      | ApiPreviewResponse
      | { error: string; durationMs: number };

    if ("error" in parsed) {
      throw new Error(parsed.error);
    }

    return parsed;
  } finally {
    await wc.fs.rm(reqFile, { force: true }).catch(() => {});
  }
}

