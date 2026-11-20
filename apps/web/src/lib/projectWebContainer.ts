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
