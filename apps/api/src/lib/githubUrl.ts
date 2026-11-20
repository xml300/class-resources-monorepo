export interface ParsedGithubRepo {
  owner: string;
  repo: string;
  branch?: string;
  subpath?: string;
  canonicalRepoUrl: string;
}

/**
 * Parse a GitHub repository reference such as:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo/tree/main/day-03/demo
 * - owner/repo
 */
export function parseGithubRepoUrl(rawInput: string): ParsedGithubRepo {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error("GitHub repository URL is required");
  }

  // Handle shorthand "owner/repo"
  if (!trimmed.includes("://") && !trimmed.startsWith("github.com/")) {
    const parts = trimmed.replace(/^\/+|\/+$/g, "").split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(
        'Invalid GitHub repository format. Use "https://github.com/owner/repo" or "owner/repo".'
      );
    }
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");
    if (!isValidGithubSegment(owner) || !isValidGithubSegment(repo)) {
      throw new Error("Invalid GitHub owner or repository name");
    }
    return {
      owner,
      repo,
      canonicalRepoUrl: `https://github.com/${owner}/${repo}`,
    };
  }

  const normalizedUrl = trimmed.startsWith("github.com/")
    ? `https://${trimmed}`
    : trimmed;

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    throw new Error("Invalid GitHub repository URL");
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    throw new Error("Only github.com repository URLs are supported");
  }

  const segments = parsed.pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);

  if (segments.length < 2) {
    throw new Error(
      'GitHub URL must include owner and repo (e.g., "https://github.com/owner/repo").'
    );
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");
  if (!isValidGithubSegment(owner) || !isValidGithubSegment(repo)) {
    throw new Error("Invalid GitHub owner or repository name");
  }

  let branch: string | undefined;
  let subpath: string | undefined;

  if (segments[2] === "tree" && segments.length >= 4) {
    branch = decodeURIComponent(segments[3]);
    if (segments.length > 4) {
      subpath = segments
        .slice(4)
        .map((s) => decodeURIComponent(s))
        .join("/");
    }
  }

  return {
    owner,
    repo,
    branch,
    subpath,
    canonicalRepoUrl: `https://github.com/${owner}/${repo}`,
  };
}

function isValidGithubSegment(value: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(value) && value !== "." && value !== "..";
}

/**
 * Normalize a relative target subfolder path inside a GitHub repo.
 * Returns "" for repo root.
 */
export function normalizeRepoTargetPath(rawPath?: string | null): string {
  if (!rawPath) return "";
  const cleaned = rawPath
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!cleaned) return "";

  const segments = cleaned.split("/").filter(Boolean);
  for (const seg of segments) {
    if (seg === "." || seg === "..") {
      throw new Error("Target path cannot contain '.' or '..' segments");
    }
  }
  return segments.join("/");
}

/**
 * Join a normalized repo target path with a relative file path.
 */
export function joinRepoFilePath(targetPath: string, filePath: string): string {
  const cleanFile = filePath
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  return targetPath ? `${targetPath}/${cleanFile}` : cleanFile;
}

/**
 * Build the GitHub web URL for viewing the pushed folder (or repo root).
 */
export function buildGithubFolderUrl(
  owner: string,
  repo: string,
  branch: string,
  targetPath: string
): string {
  const base = `https://github.com/${owner}/${repo}`;
  if (!targetPath) {
    return `${base}/tree/${encodeURIComponent(branch)}`;
  }
  const encodedPath = targetPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base}/tree/${encodeURIComponent(branch)}/${encodedPath}`;
}

export interface GitTreeBlobEntry {
  path: string;
  mode: string;
  type: "blob";
  sha: string;
}

/**
 * Keep all existing repo blobs that fall outside `targetPath` so that
 * pushing a folder cleanly replaces the target folder (removing deleted files)
 * without touching the rest of the repository.
 */
export function filterPreservedTreeBlobs(
  existingBlobs: GitTreeBlobEntry[],
  targetPath: string
): GitTreeBlobEntry[] {
  if (!targetPath) {
    return [];
  }
  const prefix = `${targetPath}/`;
  return existingBlobs.filter(
    (entry) => entry.path !== targetPath && !entry.path.startsWith(prefix)
  );
}

export interface SubtreeBlobCandidate {
  repoPath: string;
  relativePath: string;
  sha: string;
  size?: number;
}

/**
 * Extract all blobs belonging to `targetPath` (or the entire repo when `targetPath` is "")
 * and strip the `targetPath/` prefix to produce relative paths for resource_files.
 */
export function extractSubtreeBlobs(
  existingBlobs: Array<GitTreeBlobEntry & { size?: number }>,
  targetPath: string
): SubtreeBlobCandidate[] {
  if (!targetPath) {
    return existingBlobs.map((entry) => ({
      repoPath: entry.path,
      relativePath: entry.path,
      sha: entry.sha,
      size: entry.size,
    }));
  }

  const prefix = `${targetPath}/`;
  const results: SubtreeBlobCandidate[] = [];
  for (const entry of existingBlobs) {
    if (entry.path.startsWith(prefix)) {
      const relativePath = entry.path.slice(prefix.length);
      if (relativePath) {
        results.push({
          repoPath: entry.path,
          relativePath,
          sha: entry.sha,
          size: entry.size,
        });
      }
    } else if (entry.path === targetPath) {
      // Target points to a single file
      const fileName = targetPath.split("/").pop() || targetPath;
      results.push({
        repoPath: entry.path,
        relativePath: fileName,
        sha: entry.sha,
        size: entry.size,
      });
    }
  }
  return results;
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

export function shouldIgnoreGithubFilePath(relativePath: string): string | null {
  const segments = relativePath.split("/").filter(Boolean);
  if (segments.length === 0) return "Empty path";

  for (const seg of segments) {
    if (seg === "." || seg === "..") {
      return "Invalid path segment";
    }
  }

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

export function suggestRunCommandFromFiles(
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

