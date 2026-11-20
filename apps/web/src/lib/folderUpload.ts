import { inferCodeLanguage, type ResourceFileInput } from "@repo/shared";

export interface ScannedFolderFile extends ResourceFileInput {
  sizeBytes: number;
  selected: boolean;
}

export interface SkippedFolderFile {
  path: string;
  reason: string;
}

export interface FolderScanResult {
  folderName: string;
  files: ScannedFolderFile[];
  skipped: SkippedFolderFile[];
  suggestedRunCommand: string | null;
}

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  ".parcel-cache",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
  ".idea",
  ".vscode",
  ".svelte-kit",
  "out",
  ".output",
]);

const IGNORED_FILES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
]);

const BINARY_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
  "tiff",
  "avif",
  "pdf",
  "zip",
  "tar",
  "gz",
  "tgz",
  "rar",
  "7z",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "mp3",
  "wav",
  "ogg",
  "mp4",
  "webm",
  "mov",
  "avi",
  "wasm",
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "dat",
  "sqlite",
  "db",
  "class",
  "jar",
  "pyc",
]);

const MAX_SINGLE_FILE_BYTES = 512 * 1024; // 512 KB
const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 500;

function shouldIgnoreRelativePath(relativePath: string): string | null {
  const segments = relativePath.split("/").filter(Boolean);
  if (segments.length === 0) return "Empty path";

  for (let i = 0; i < segments.length - 1; i++) {
    if (IGNORED_DIRS.has(segments[i])) {
      return `Ignored directory (${segments[i]})`;
    }
  }

  const filename = segments[segments.length - 1];
  const lower = filename.toLowerCase();

  if (IGNORED_FILES.has(lower)) {
    return "Ignored lock/system file";
  }
  if (
    (lower === ".env" || lower.startsWith(".env.")) &&
    !lower.endsWith(".example") &&
    !lower.endsWith(".sample")
  ) {
    return "Secret .env file excluded";
  }
  if (lower.endsWith(".log")) {
    return "Log file excluded";
  }

  const dotIdx = lower.lastIndexOf(".");
  if (dotIdx !== -1) {
    const ext = lower.slice(dotIdx + 1);
    if (BINARY_EXTENSIONS.has(ext)) {
      return `Binary file (.${ext}) excluded`;
    }
  }

  return null;
}

function looksBinary(text: string): boolean {
  const sample = text.slice(0, 4096);
  return sample.includes("\u0000");
}

export function suggestRunCommand(
  files: Array<{ path: string; content: string }>
): string | null {
  const fileMap = new Map(files.map((f) => [f.path, f.content]));

  const pkgRaw = fileMap.get("package.json");
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw) as {
        scripts?: Record<string, string>;
        main?: string;
      };
      if (pkg.scripts?.dev) return "npm run dev";
      if (pkg.scripts?.start) return "npm start";
      if (pkg.scripts?.serve) return "npm run serve";
      if (pkg.main && fileMap.has(pkg.main.replace(/^\.\//, ""))) {
        return `node ${pkg.main.replace(/^\.\//, "")}`;
      }
    } catch {
      // Ignore malformed package.json
    }
  }

  if (fileMap.has("index.html")) return "static";
  if (fileMap.has("public/index.html")) return "static";

  const entryCandidates = [
    "server.ts",
    "server.js",
    "index.ts",
    "index.js",
    "main.ts",
    "main.js",
    "app.ts",
    "app.js",
    "src/index.ts",
    "src/index.js",
    "src/main.ts",
    "src/main.js",
  ];
  for (const candidate of entryCandidates) {
    if (fileMap.has(candidate)) {
      return candidate.endsWith(".ts")
        ? `npx --yes tsx ${candidate}`
        : `node ${candidate}`;
    }
  }

  return null;
}

export function slugifyFolderName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

interface RawFileEntry {
  relativePath: string;
  file: File;
}

async function processRawEntries(
  rawEntries: RawFileEntry[]
): Promise<FolderScanResult> {
  if (rawEntries.length === 0) {
    return {
      folderName: "",
      files: [],
      skipped: [],
      suggestedRunCommand: null,
    };
  }

  const firstSegments = new Set(
    rawEntries
      .map((e) => e.relativePath.replace(/^\/+/, "").split("/")[0])
      .filter(Boolean)
  );
  let folderName = "";
  let stripPrefix = "";
  if (
    firstSegments.size === 1 &&
    rawEntries.every((e) => e.relativePath.replace(/^\/+/, "").includes("/"))
  ) {
    folderName = Array.from(firstSegments)[0];
    stripPrefix = `${folderName}/`;
  }

  const files: ScannedFolderFile[] = [];
  const skipped: SkippedFolderFile[] = [];
  let totalBytes = 0;

  const sorted = [...rawEntries].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath)
  );

  for (const entry of sorted) {
    let rel = entry.relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (stripPrefix && rel.startsWith(stripPrefix)) {
      rel = rel.slice(stripPrefix.length);
    }
    if (!rel) continue;

    const ignoreReason = shouldIgnoreRelativePath(rel);
    if (ignoreReason) {
      skipped.push({ path: rel, reason: ignoreReason });
      continue;
    }

    if (entry.file.size > MAX_SINGLE_FILE_BYTES) {
      skipped.push({
        path: rel,
        reason: `File too large (${Math.round(entry.file.size / 1024)} KB > 512 KB)`,
      });
      continue;
    }

    if (files.length >= MAX_FILES) {
      skipped.push({
        path: rel,
        reason: `Exceeded ${MAX_FILES} file limit`,
      });
      continue;
    }

    if (totalBytes + entry.file.size > MAX_TOTAL_BYTES) {
      skipped.push({
        path: rel,
        reason: "Exceeded 10 MB total folder limit",
      });
      continue;
    }

    const content = await entry.file.text();
    if (looksBinary(content)) {
      skipped.push({ path: rel, reason: "Binary content detected" });
      continue;
    }

    totalBytes += entry.file.size;
    files.push({
      path: rel,
      content,
      language: inferCodeLanguage(rel, null),
      sizeBytes: entry.file.size,
      selected: true,
    });
  }

  return {
    folderName,
    files,
    skipped,
    suggestedRunCommand: suggestRunCommand(files),
  };
}

export async function scanFileListFolder(
  fileList: FileList | File[]
): Promise<FolderScanResult> {
  const arr = Array.from(fileList);
  const rawEntries: RawFileEntry[] = arr.map((file) => {
    const webkitPath =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      file.name;
    return { relativePath: webkitPath, file };
  });
  return processRawEntries(rawEntries);
}

interface WebkitFileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file?: (
    successCallback: (file: File) => void,
    errorCallback?: (err: unknown) => void
  ) => void;
  createReader?: () => {
    readEntries: (
      successCallback: (entries: WebkitFileSystemEntry[]) => void,
      errorCallback?: (err: unknown) => void
    ) => void;
  };
}

async function readEntryRecursively(
  entry: WebkitFileSystemEntry,
  prefix: string,
  out: RawFileEntry[]
): Promise<void> {
  const currentPath = prefix ? `${prefix}/${entry.name}` : entry.name;

  if (entry.isDirectory) {
    if (IGNORED_DIRS.has(entry.name)) {
      return;
    }
    const reader = entry.createReader?.();
    if (!reader) return;

    const children: WebkitFileSystemEntry[] = [];
    while (true) {
      const batch = await new Promise<WebkitFileSystemEntry[]>(
        (resolve, reject) => {
          reader.readEntries(resolve, reject);
        }
      );
      if (batch.length === 0) break;
      children.push(...batch);
    }

    for (const child of children) {
      await readEntryRecursively(child, currentPath, out);
    }
    return;
  }

  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((resolve, reject) => {
      entry.file!(resolve, reject);
    });
    out.push({ relativePath: currentPath, file });
  }
}

export async function scanDroppedFolder(
  dataTransfer: DataTransfer
): Promise<FolderScanResult> {
  const items = Array.from(dataTransfer.items || []);
  const rawEntries: RawFileEntry[] = [];

  const entries: WebkitFileSystemEntry[] = [];
  for (const item of items) {
    const webkitItem = item as DataTransferItem & {
      webkitGetAsEntry?: () => WebkitFileSystemEntry | null;
    };
    const entry = webkitItem.webkitGetAsEntry?.();
    if (entry) {
      entries.push(entry);
    }
  }

  if (entries.length > 0) {
    for (const entry of entries) {
      await readEntryRecursively(entry, "", rawEntries);
    }
    return processRawEntries(rawEntries);
  }

  return scanFileListFolder(dataTransfer.files);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
