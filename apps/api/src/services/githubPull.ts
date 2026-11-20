import { inferCodeLanguage } from "@repo/shared";
import {
  buildGithubFolderUrl,
  extractSubtreeBlobs,
  normalizeRepoTargetPath,
  parseGithubRepoUrl,
  shouldIgnoreGithubFilePath,
  suggestRunCommandFromFiles,
  type GitTreeBlobEntry,
} from "../lib/githubUrl.js";
import {
  getOptionalGithubToken,
  GithubApiError,
  githubRequest,
  runWithConcurrency,
} from "./githubClient.js";

const MAX_SINGLE_FILE_BYTES = 512 * 1024; // 512 KB
const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 500;

export interface PulledGithubFile {
  path: string;
  content: string;
  language: string | null;
  sizeBytes: number;
}

export interface PullFilesFromGithubOptions {
  repoUrl: string;
  branch?: string;
  targetPath?: string;
}

export interface PullFilesFromGithubResult {
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  targetPath: string;
  folderUrl: string;
  commitSha: string;
  commitUrl: string;
  files: PulledGithubFile[];
  skipped: Array<{ path: string; reason: string }>;
  suggestedRunCommand: string | null;
  pulledAt: string;
}

function looksBinary(text: string): boolean {
  return text.slice(0, 4096).includes("\u0000");
}

export async function pullFilesFromGithub(
  options: PullFilesFromGithubOptions
): Promise<PullFilesFromGithubResult> {
  const token = getOptionalGithubToken();

  let parsedRepo;
  let targetPath: string;
  try {
    parsedRepo = parseGithubRepoUrl(options.repoUrl);
    targetPath = normalizeRepoTargetPath(
      options.targetPath !== undefined && options.targetPath !== ""
        ? options.targetPath
        : parsedRepo.subpath ?? ""
    );
  } catch (err) {
    throw new GithubApiError(
      err instanceof Error ? err.message : "Invalid GitHub repository settings",
      400
    );
  }

  const { owner, repo, canonicalRepoUrl } = parsedRepo;

  // 1. Fetch repo metadata to resolve default branch
  const repoResp = await githubRequest<{
    default_branch: string;
    private: boolean;
  }>(`/repos/${owner}/${repo}`, token, {
    permissionHint:
      "Ensure GITHUB_TOKEN has Contents: Read access to this repository.",
  });

  const branch =
    options.branch?.trim() ||
    parsedRepo.branch ||
    repoResp.data.default_branch ||
    "main";

  // 2. Resolve branch HEAD commit and tree SHA
  const refResp = await githubRequest<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    token
  );
  const commitSha = refResp.data.object.sha;

  const commitResp = await githubRequest<{ tree: { sha: string } }>(
    `/repos/${owner}/${repo}/git/commits/${commitSha}`,
    token
  );
  const baseTreeSha = commitResp.data.tree.sha;

  // 3. Fetch recursive tree
  const treeResp = await githubRequest<{
    truncated: boolean;
    tree: Array<{
      path: string;
      mode: string;
      type: string;
      sha: string;
      size?: number;
    }>;
  }>(`/repos/${owner}/${repo}/git/trees/${baseTreeSha}?recursive=1`, token);

  const allBlobs: Array<GitTreeBlobEntry & { size?: number }> = treeResp.data.tree
    .filter((entry) => entry.type === "blob" && Boolean(entry.sha))
    .map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      type: "blob" as const,
      sha: entry.sha,
      size: entry.size,
    }));

  const subtreeCandidates = extractSubtreeBlobs(allBlobs, targetPath).sort(
    (a, b) => a.relativePath.localeCompare(b.relativePath)
  );

  if (subtreeCandidates.length === 0) {
    throw new GithubApiError(
      targetPath
        ? `No files found under "${targetPath}" on branch "${branch}" in ${owner}/${repo}.`
        : `No files found on branch "${branch}" in ${owner}/${repo}.`,
      404
    );
  }

  // 4. Filter candidates before fetching blobs
  const skipped: Array<{ path: string; reason: string }> = [];
  const toFetch: typeof subtreeCandidates = [];
  let projectedBytes = 0;

  for (const item of subtreeCandidates) {
    const ignoreReason = shouldIgnoreGithubFilePath(item.relativePath);
    if (ignoreReason) {
      skipped.push({ path: item.relativePath, reason: ignoreReason });
      continue;
    }

    const size = item.size ?? 0;
    if (size > MAX_SINGLE_FILE_BYTES) {
      skipped.push({
        path: item.relativePath,
        reason: `File too large (${Math.round(size / 1024)} KB > 512 KB)`,
      });
      continue;
    }

    if (toFetch.length >= MAX_FILES) {
      skipped.push({
        path: item.relativePath,
        reason: `Exceeded ${MAX_FILES} file limit`,
      });
      continue;
    }

    if (projectedBytes + size > MAX_TOTAL_BYTES) {
      skipped.push({
        path: item.relativePath,
        reason: "Exceeded 10 MB total folder limit",
      });
      continue;
    }

    projectedBytes += size;
    toFetch.push(item);
  }

  if (toFetch.length === 0) {
    throw new GithubApiError(
      "No readable text/code files found at that GitHub path (binaries, node_modules, lockfiles, and .env files are skipped).",
      400
    );
  }

  // 5. Download blobs concurrently
  const fetched = await runWithConcurrency(toFetch, 6, async (candidate) => {
    const blobResp = await githubRequest<{
      content: string;
      encoding: string;
      size: number;
    }>(`/repos/${owner}/${repo}/git/blobs/${candidate.sha}`, token);

    let decoded: string;
    if (blobResp.data.encoding === "base64") {
      decoded = Buffer.from(
        blobResp.data.content.replace(/\n/g, ""),
        "base64"
      ).toString("utf-8");
    } else {
      decoded = blobResp.data.content ?? "";
    }

    if (looksBinary(decoded)) {
      return { skippedReason: "Binary content detected", candidate };
    }

    const sizeBytes = Buffer.byteLength(decoded, "utf-8");
    return {
      file: {
        path: candidate.relativePath,
        content: decoded,
        language: inferCodeLanguage(candidate.relativePath, null),
        sizeBytes,
      } satisfies PulledGithubFile,
    };
  });

  const files: PulledGithubFile[] = [];
  for (const item of fetched) {
    if ("file" in item && item.file) {
      files.push(item.file);
    } else if ("skippedReason" in item && item.candidate) {
      skipped.push({
        path: item.candidate.relativePath,
        reason: item.skippedReason,
      });
    }
  }

  if (files.length === 0) {
    throw new GithubApiError(
      "All files at that GitHub path were binary or excluded.",
      400
    );
  }

  files.sort((a, b) => a.path.localeCompare(b.path));

  const pulledAt = new Date().toISOString();
  const suggestedRunCommand = suggestRunCommandFromFiles(files);

  return {
    repoUrl: canonicalRepoUrl,
    owner,
    repo,
    branch,
    targetPath,
    folderUrl: buildGithubFolderUrl(owner, repo, branch, targetPath),
    commitSha,
    commitUrl: `${canonicalRepoUrl}/commit/${commitSha}`,
    files,
    skipped,
    suggestedRunCommand,
    pulledAt,
  };
}
