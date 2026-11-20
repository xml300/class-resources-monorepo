import type { PushToGithubResultDTO } from "@repo/shared";
import { env } from "../env.js";
import {
  buildGithubFolderUrl,
  filterPreservedTreeBlobs,
  joinRepoFilePath,
  normalizeRepoTargetPath,
  parseGithubRepoUrl,
  type GitTreeBlobEntry,
} from "../lib/githubUrl.js";

export class GithubPushError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "GithubPushError";
    this.status = status;
  }
}

interface GithubFilePayload {
  path: string;
  content: string;
}

interface PushFilesToGithubOptions {
  repoUrl: string;
  branch?: string;
  targetPath?: string;
  commitMessage?: string;
  files: GithubFilePayload[];
}

const GITHUB_API_BASE = "https://api.github.com";

async function githubRequest<T>(
  endpoint: string,
  token: string,
  init?: RequestInit
): Promise<{ status: number; data: T }> {
  const res = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "class-resources-monorepo",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text };
    }
  }

  if (!res.ok) {
    const msg =
      typeof parsed === "object" &&
      parsed !== null &&
      "message" in parsed &&
      typeof (parsed as { message?: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : `GitHub API error (${res.status})`;

    if (res.status === 401) {
      throw new GithubPushError(
        `GitHub authentication failed (${msg}). Check GITHUB_TOKEN in apps/api/.env.`,
        401
      );
    }
    if (res.status === 403) {
      throw new GithubPushError(
        `GitHub permission denied (${msg}). Ensure GITHUB_TOKEN has Contents: Read & Write access to this repository.`,
        403
      );
    }
    if (res.status === 404) {
      throw new GithubPushError(
        `GitHub repository or branch not found (${msg}). Verify the repository URL and token access.`,
        404
      );
    }

    throw new GithubPushError(`GitHub API error: ${msg}`, res.status);
  }

  return { status: res.status, data: parsed as T };
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function next() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx]);
    }
  }

  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    () => next()
  );
  await Promise.all(runners);
  return results;
}

export async function pushFilesToGithub(
  options: PushFilesToGithubOptions
): Promise<PushToGithubResultDTO> {
  const token = env.GITHUB_TOKEN.trim();
  if (!token) {
    throw new GithubPushError(
      "GITHUB_TOKEN is not configured on the server. Add a GitHub Personal Access Token (with Contents: Read & Write) to apps/api/.env to push code folders.",
      400
    );
  }

  if (!options.files || options.files.length === 0) {
    throw new GithubPushError("No files to push to GitHub.", 400);
  }

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
    throw new GithubPushError(
      err instanceof Error ? err.message : "Invalid GitHub repository settings",
      400
    );
  }

  const { owner, repo, canonicalRepoUrl } = parsedRepo;

  // 1. Fetch repository metadata to resolve default branch
  const repoResp = await githubRequest<{
    default_branch: string;
    private: boolean;
  }>(`/repos/${owner}/${repo}`, token);

  const branch =
    options.branch?.trim() ||
    parsedRepo.branch ||
    repoResp.data.default_branch ||
    "main";

  const commitMessage =
    options.commitMessage?.trim() ||
    (targetPath
      ? `Update code folder: ${targetPath}`
      : "Update code folder from Class Resources");

  // 2. Resolve current branch HEAD commit (handle brand-new empty repositories too)
  let headCommitSha: string | null = null;
  let baseTreeSha: string | null = null;

  try {
    const refResp = await githubRequest<{ object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
      token
    );
    headCommitSha = refResp.data.object.sha;

    const commitResp = await githubRequest<{ tree: { sha: string } }>(
      `/repos/${owner}/${repo}/git/commits/${headCommitSha}`,
      token
    );
    baseTreeSha = commitResp.data.tree.sha;
  } catch (err) {
    // Empty repository returns 409 "Git Repository is empty." or 404 for ref
    if (
      err instanceof GithubPushError &&
      (err.status === 409 || err.status === 404)
    ) {
      // Bootstrap empty repo with the first file via Contents API
      const firstFile = options.files[0];
      const firstRepoPath = joinRepoFilePath(targetPath, firstFile.path);
      const bootstrapResp = await githubRequest<{
        commit: { sha: string; tree: { sha: string } };
      }>(
        `/repos/${owner}/${repo}/contents/${firstRepoPath
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            message:
              options.files.length === 1
                ? commitMessage
                : `Initialize repository with ${firstRepoPath}`,
            content: Buffer.from(firstFile.content, "utf-8").toString("base64"),
            branch,
          }),
        }
      );

      if (options.files.length === 1) {
        const pushedAt = new Date().toISOString();
        return {
          repoUrl: canonicalRepoUrl,
          owner,
          repo,
          branch,
          targetPath,
          folderUrl: buildGithubFolderUrl(owner, repo, branch, targetPath),
          commitSha: bootstrapResp.data.commit.sha,
          commitUrl: `${canonicalRepoUrl}/commit/${bootstrapResp.data.commit.sha}`,
          filesPushed: 1,
          pushedAt,
        };
      }

      headCommitSha = bootstrapResp.data.commit.sha;
      baseTreeSha = bootstrapResp.data.commit.tree.sha;
    } else {
      throw err;
    }
  }

  // 3. Read existing recursive tree so we can cleanly replace targetPath without leaving stale files
  const existingTreeResp = await githubRequest<{
    truncated: boolean;
    tree: Array<{ path: string; mode: string; type: string; sha: string }>;
  }>(`/repos/${owner}/${repo}/git/trees/${baseTreeSha}?recursive=1`, token);

  const existingBlobs: GitTreeBlobEntry[] = existingTreeResp.data.tree
    .filter(
      (entry): entry is GitTreeBlobEntry =>
        entry.type === "blob" && Boolean(entry.sha)
    )
    .map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      type: "blob",
      sha: entry.sha,
    }));

  // 4. Create Git blobs for all uploaded files (limited concurrency)
  const newBlobEntries = await runWithConcurrency(
    options.files,
    5,
    async (file) => {
      const blobResp = await githubRequest<{ sha: string }>(
        `/repos/${owner}/${repo}/git/blobs`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            content: file.content,
            encoding: "utf-8",
          }),
        }
      );
      return {
        path: joinRepoFilePath(targetPath, file.path),
        mode: "100644",
        type: "blob" as const,
        sha: blobResp.data.sha,
      };
    }
  );

  // 5. Build the new tree
  let treePayload: Record<string, unknown>;
  if (!existingTreeResp.data.truncated) {
    const preserved = filterPreservedTreeBlobs(existingBlobs, targetPath);
    treePayload = {
      tree: [...preserved, ...newBlobEntries],
    };
  } else {
    // Fallback for gigantic repos where recursive tree is truncated
    treePayload = {
      base_tree: baseTreeSha,
      tree: newBlobEntries,
    };
  }

  const newTreeResp = await githubRequest<{ sha: string }>(
    `/repos/${owner}/${repo}/git/trees`,
    token,
    {
      method: "POST",
      body: JSON.stringify(treePayload),
    }
  );

  // 6. Create the commit
  const newCommitResp = await githubRequest<{ sha: string }>(
    `/repos/${owner}/${repo}/git/commits`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        message: commitMessage,
        tree: newTreeResp.data.sha,
        parents: headCommitSha ? [headCommitSha] : [],
      }),
    }
  );

  // 7. Fast-forward the branch ref
  await githubRequest(
    `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({
        sha: newCommitResp.data.sha,
        force: false,
      }),
    }
  );

  const pushedAt = new Date().toISOString();
  return {
    repoUrl: canonicalRepoUrl,
    owner,
    repo,
    branch,
    targetPath,
    folderUrl: buildGithubFolderUrl(owner, repo, branch, targetPath),
    commitSha: newCommitResp.data.sha,
    commitUrl: `${canonicalRepoUrl}/commit/${newCommitResp.data.sha}`,
    filesPushed: options.files.length,
    pushedAt,
  };
}
