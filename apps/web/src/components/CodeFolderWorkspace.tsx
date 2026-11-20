import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  Folder,
  FolderOpen,
  GitBranch,
  Globe,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Terminal,
  Trash2,
} from "lucide-react";
import {
  inferCodeLanguage,
  type ResourceFileDTO,
  type ResourceWithDayDTO,
} from "@repo/shared";
import { CodeMirrorEditor } from "./CodeMirrorEditor";
import { suggestRunCommand } from "../lib/folderUpload";
import { triggerZipDownload } from "../lib/zipDownload";
import {
  runProjectInWebContainer,
  stopProjectExecution,
  updateMountedProjectFile,
  type ProjectRunnerPhase,
} from "../lib/projectWebContainer";
import { isWebContainerSupported } from "../lib/webcontainerRunner";

interface CodeFolderWorkspaceProps {
  resource: ResourceWithDayDTO;
  files: ResourceFileDTO[];
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildFileTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const fullPath of paths) {
    const parts = fullPath.split("/").filter(Boolean);
    let currentLevel = root;
    let builtPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      builtPath = builtPath ? `${builtPath}/${part}` : part;
      const isDir = i < parts.length - 1;

      let existing = currentLevel.find(
        (n) => n.name === part && n.isDir === isDir
      );
      if (!existing) {
        existing = {
          name: part,
          path: builtPath,
          isDir,
          children: [],
        };
        currentLevel.push(existing);
      }
      currentLevel = existing.children;
    }
  }

  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.isDir) sortNodes(node.children);
    }
    return nodes;
  };

  return sortNodes(root);
}

function pickInitialFile(files: ResourceFileDTO[]): string {
  const preferred = [
    "src/App.tsx",
    "src/App.jsx",
    "src/index.ts",
    "src/index.js",
    "src/main.ts",
    "src/main.js",
    "index.ts",
    "index.js",
    "server.ts",
    "server.js",
    "app.ts",
    "app.js",
    "index.html",
    "README.md",
    "package.json",
  ];
  for (const candidate of preferred) {
    if (files.some((f) => f.path === candidate)) return candidate;
  }
  return files[0]?.path ?? "";
}

function mapToEditorLanguage(
  path: string,
  explicitLang?: string | null
): "javascript" | "typescript" | "jsx" | "tsx" | "json" | "plaintext" {
  const inferred = inferCodeLanguage(path, explicitLang);
  if (inferred === "typescript") return "typescript";
  if (inferred === "javascript") return "javascript";
  if (inferred === "tsx") return "tsx";
  if (inferred === "jsx") return "jsx";
  if (inferred === "json") return "json";
  return "plaintext";
}

function buildGithubFolderLink(resource: ResourceWithDayDTO): string | null {
  if (!resource.githubRepoUrl) return null;
  const base = resource.githubRepoUrl.replace(/\/+$/, "");
  const branch = resource.githubBranch || "main";
  const path = (resource.githubPath || "").replace(/^\/+|\/+$/g, "");
  if (!path) {
    return `${base}/tree/${encodeURIComponent(branch)}`;
  }
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/tree/${encodeURIComponent(branch)}/${encodedPath}`;
}

export function CodeFolderWorkspace({
  resource,
  files,
}: CodeFolderWorkspaceProps) {
  const [editedMap, setEditedMap] = useState<Record<string, string>>({});
  const [activePath, setActivePath] = useState<string>(() =>
    pickInitialFile(files)
  );
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => {
    const dirs = new Set<string>();
    for (const f of files) {
      const parts = f.path.split("/");
      let acc = "";
      for (let i = 0; i < parts.length - 1; i++) {
        acc = acc ? `${acc}/${parts[i]}` : parts[i];
        dirs.add(acc);
      }
    }
    return dirs;
  });

  const defaultRunCmd = useMemo(() => {
    return (
      resource.runCommand ||
      suggestRunCommand(
        files.map((f) => ({ path: f.path, content: f.content }))
      ) ||
      "npm start"
    );
  }, [resource.runCommand, files]);

  const [runCommand, setRunCommand] = useState(defaultRunCmd);
  const [phase, setPhase] = useState<ProjectRunnerPhase>("idle");
  const [phaseDetail, setPhaseDetail] = useState<string>("");
  const [consoleOutput, setConsoleOutput] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPort, setPreviewPort] = useState<number | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [bottomTab, setBottomTab] = useState<"console" | "preview">("console");
  const [copiedFile, setCopiedFile] = useState(false);
  const [copiedClone, setCopiedClone] = useState(false);

  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  const wcSupport = useMemo(() => isWebContainerSupported(), []);

  useEffect(() => {
    setEditedMap({});
    setActivePath(pickInitialFile(files));
    const dirs = new Set<string>();
    for (const f of files) {
      const parts = f.path.split("/");
      let acc = "";
      for (let i = 0; i < parts.length - 1; i++) {
        acc = acc ? `${acc}/${parts[i]}` : parts[i];
        dirs.add(acc);
      }
    }
    setExpandedDirs(dirs);
    setRunCommand(defaultRunCmd);
    setPhase("idle");
    setPhaseDetail("");
    setConsoleOutput("");
    setPreviewUrl(null);
    setPreviewPort(null);
    setBottomTab("console");
  }, [resource.id, files, defaultRunCmd]);

  useEffect(() => {
    return () => {
      void stopProjectExecution();
    };
  }, [resource.id]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleOutput]);

  const originalMap = useMemo(
    () => new Map(files.map((f) => [f.path, f])),
    [files]
  );

  const currentFiles = useMemo(
    () =>
      files.map((f) => ({
        path: f.path,
        content: editedMap[f.path] ?? f.content,
        language: f.language,
      })),
    [files, editedMap]
  );

  const activeFile = useMemo(
    () => currentFiles.find((f) => f.path === activePath) ?? currentFiles[0],
    [currentFiles, activePath]
  );

  const tree = useMemo(
    () => buildFileTree(files.map((f) => f.path)),
    [files]
  );

  const hasEdits = Object.keys(editedMap).length > 0;
  const isBusy =
    phase === "booting" ||
    phase === "mounting" ||
    phase === "installing" ||
    phase === "running" ||
    phase === "server-ready";

  const githubFolderUrl = useMemo(
    () => buildGithubFolderLink(resource),
    [resource]
  );

  const handleEditorChange = useCallback(
    (nextVal: string) => {
      if (!activeFile) return;
      const orig = originalMap.get(activeFile.path)?.content ?? "";
      setEditedMap((prev) => {
        if (nextVal === orig) {
          const copy = { ...prev };
          delete copy[activeFile.path];
          return copy;
        }
        return { ...prev, [activeFile.path]: nextVal };
      });
      void updateMountedProjectFile(activeFile.path, nextVal);
    },
    [activeFile, originalMap]
  );

  const handleRun = useCallback(async () => {
    setConsoleOutput("");
    setPreviewUrl(null);
    setPreviewPort(null);
    setBottomTab("console");
    try {
      await runProjectInWebContainer(
        currentFiles.map((f) => ({ path: f.path, content: f.content })),
        runCommand,
        {
          onPhaseChange: (nextPhase, detail) => {
            setPhase(nextPhase);
            setPhaseDetail(detail ?? "");
          },
          onOutput: (chunk) => {
            setConsoleOutput((prev) => prev + chunk);
          },
          onServerReady: (url, port) => {
            setPreviewUrl(url);
            setPreviewPort(port);
            setBottomTab("preview");
          },
          onExit: () => {},
        }
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to run project in browser";
      setPhase("error");
      setPhaseDetail(msg);
      setConsoleOutput((prev) => `${prev}\nError: ${msg}\n`);
    }
  }, [currentFiles, runCommand]);

  const handleStop = useCallback(async () => {
    await stopProjectExecution();
    setPhase("idle");
    setPhaseDetail("Stopped");
    setPreviewUrl(null);
    setPreviewPort(null);
  }, []);

  const handleReset = () => {
    setEditedMap({});
    for (const f of files) {
      void updateMountedProjectFile(f.path, f.content);
    }
  };

  const handleCopyFile = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 1800);
  };

  const handleCopyClone = async () => {
    if (!resource.githubRepoUrl) return;
    const cloneUrl = resource.githubRepoUrl.endsWith(".git")
      ? resource.githubRepoUrl
      : `${resource.githubRepoUrl}.git`;
    await navigator.clipboard.writeText(`git clone ${cloneUrl}`);
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 1800);
  };

  const handleDownloadZip = () => {
    triggerZipDownload(
      resource.title,
      currentFiles.map((f) => ({ path: f.path, content: f.content }))
    );
  };

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  };

  const renderTree = (nodes: TreeNode[], depth = 0) => {
    return nodes.map((node) => {
      if (node.isDir) {
        const isOpen = expandedDirs.has(node.path);
        return (
          <div key={`dir:${node.path}`}>
            <button
              type="button"
              onClick={() => toggleDir(node.path)}
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
              className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-xs text-zinc-300 transition hover:bg-zinc-800/80 hover:text-zinc-100"
            >
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              )}
              {isOpen ? (
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
              ) : (
                <Folder className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
              )}
              <span className="truncate font-medium">{node.name}</span>
            </button>
            {isOpen && renderTree(node.children, depth + 1)}
          </div>
        );
      }

      const isActive = activeFile?.path === node.path;
      const isModified = node.path in editedMap;
      return (
        <button
          key={`file:${node.path}`}
          type="button"
          onClick={() => setActivePath(node.path)}
          style={{ paddingLeft: `${depth * 14 + 24}px` }}
          className={`flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-xs transition ${
            isActive
              ? "bg-emerald-950/70 text-emerald-200 ring-1 ring-inset ring-emerald-800/60"
              : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
          }`}
        >
          <FileCode2
            className={`h-3.5 w-3.5 shrink-0 ${
              isActive ? "text-emerald-400" : "text-zinc-500"
            }`}
          />
          <span className="min-w-0 flex-1 truncate font-mono">{node.name}</span>
          {isModified && (
            <span
              title="Modified locally"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
            />
          )}
        </button>
      );
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3.5">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 sm:max-w-xs">
            <Terminal className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <input
              type="text"
              value={runCommand}
              onChange={(e) => setRunCommand(e.target.value)}
              placeholder="e.g., npm run dev or node index.js"
              aria-label="Run command"
              className="w-full bg-transparent font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
          </div>

          {isBusy ? (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-800 px-3.5 py-1.5 text-xs font-semibold text-red-50 transition hover:bg-red-700"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              disabled={!wcSupport.supported}
              onClick={handleRun}
              title={
                wcSupport.supported
                  ? "Run project in browser (Ctrl/Cmd + Enter)"
                  : wcSupport.reason
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Run in Browser
            </button>
          )}

          {hasEdits && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:border-amber-700 hover:bg-amber-950/40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {githubFolderUrl && (
            <>
              <a
                href={githubFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-700 hover:text-emerald-300"
              >
                <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
                View on GitHub
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
              <button
                type="button"
                onClick={handleCopyClone}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
              >
                {copiedClone ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Copied Clone
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Clone
                  </>
                )}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleDownloadZip}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
          >
            <Download className="h-3.5 w-3.5" />
            Download .zip
          </button>
        </div>
      </div>

      {!wcSupport.supported && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 px-4 py-2.5 text-xs text-amber-200">
          In-browser execution unavailable: {wcSupport.reason} You can still
          browse, edit, and download all files.
        </div>
      )}

      <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 lg:grid-cols-[240px_1fr]">
        <div className="max-h-64 overflow-y-auto border-b border-zinc-800 bg-zinc-900/60 p-2 lg:max-h-[480px] lg:border-r lg:border-b-0">
          <div className="mb-1.5 flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Files ({files.length})
            </span>
          </div>
          <div className="space-y-0.5">{renderTree(tree)}</div>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/70 px-3.5 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <FileCode2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="truncate font-mono text-xs text-zinc-200">
                {activeFile?.path || "No file selected"}
              </span>
              {activeFile && activeFile.path in editedMap && (
                <span className="rounded bg-amber-950/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                  edited
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopyFile}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
            >
              {copiedFile ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="h-[420px] min-h-[320px] w-full">
            {activeFile && (
              <CodeMirrorEditor
                value={activeFile.content}
                onChange={handleEditorChange}
                language={mapToEditorLanguage(
                  activeFile.path,
                  activeFile.language
                )}
                onRun={wcSupport.supported ? handleRun : undefined}
                className="h-full"
              />
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/80 px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBottomTab("console")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition ${
                bottomTab === "console"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              Console
            </button>
            <button
              type="button"
              onClick={() => setBottomTab("preview")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition ${
                bottomTab === "preview"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              Live Preview
              {previewUrl && (
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {phaseDetail && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  phase === "error"
                    ? "bg-red-950/70 text-red-300"
                    : phase === "server-ready"
                      ? "bg-emerald-950/70 text-emerald-300"
                      : "bg-zinc-800 text-zinc-300"
                }`}
              >
                {phaseDetail}
              </span>
            )}
            {bottomTab === "console" && consoleOutput && (
              <button
                type="button"
                onClick={() => setConsoleOutput("")}
                title="Clear console"
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            {bottomTab === "preview" && previewUrl && (
              <>
                <button
                  type="button"
                  onClick={() => setPreviewKey((k) => k + 1)}
                  title="Reload preview"
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open preview in new tab"
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </>
            )}
          </div>
        </div>

        {bottomTab === "console" ? (
          <div className="h-56 overflow-y-auto p-3.5 font-mono text-xs leading-relaxed text-zinc-200">
            {consoleOutput ? (
              <pre className="whitespace-pre-wrap break-words">
                {consoleOutput}
              </pre>
            ) : (
              <p className="text-zinc-500">
                Click <span className="text-emerald-400">Run in Browser</span> to
                execute this project inside WebContainer. Console output will
                appear here.
              </p>
            )}
            <div ref={consoleEndRef} />
          </div>
        ) : previewUrl ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/40 px-3 py-1.5 font-mono text-[11px] text-zinc-400">
              <span className="rounded bg-emerald-950/70 px-1.5 py-0.5 text-emerald-300">
                :{previewPort ?? 3000}
              </span>
              <span className="truncate">{previewUrl}</span>
            </div>
            <iframe
              key={`${previewUrl}-${previewKey}`}
              src={previewUrl}
              title={`${resource.title} Live Preview`}
              className="h-[460px] w-full bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          </div>
        ) : (
          <div className="flex h-56 flex-col items-center justify-center p-6 text-center text-xs text-zinc-500">
            <Globe className="mb-2 h-6 w-6 text-zinc-600" />
            <p>No live server running yet.</p>
            <p className="mt-1 text-zinc-600">
              Start a web server (e.g. <code className="text-zinc-400">npm run dev</code>,{" "}
              <code className="text-zinc-400">static</code>, or an Express app)
              to see the live preview here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
