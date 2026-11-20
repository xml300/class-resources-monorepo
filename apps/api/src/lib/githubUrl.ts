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
