import type {
  GithubPullRequestCommentDTO,
  GithubPullRequestCommitDTO,
  GithubPullRequestDetailDTO,
  GithubPullRequestFileDTO,
  GithubPullRequestReviewDTO,
  GithubPullRequestSummaryDTO,
  GithubUserDTO,
  MergePrResultDTO,
  PrMergeMethod,
  PrReviewEvent,
} from "@repo/shared";
import { parseGithubRepoUrl } from "../lib/githubUrl.js";
import {
  getOptionalGithubToken,
  GithubApiError,
  githubRequest,
  requireGithubToken,
} from "./githubClient.js";

interface RawGithubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

interface RawGithubPr {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  draft?: boolean;
  merged?: boolean;
  merged_at: string | null;
  html_url: string;
  user: RawGithubUser | null;
  head: { ref: string; sha: string };
  base: { ref: string };
  created_at: string;
  updated_at: string;
  comments?: number;
  review_comments?: number;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  commits?: number;
  mergeable?: boolean | null;
  mergeable_state?: string | null;
  labels?: Array<{ name?: string; color?: string }>;
}

interface RawGithubPrFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previous_filename?: string;
}

interface RawGithubIssueComment {
  id: number;
  body: string | null;
  user: RawGithubUser | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

interface RawGithubReviewComment {
  id: number;
  body: string | null;
  user: RawGithubUser | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  path?: string;
  line?: number | null;
  original_line?: number | null;
}

interface RawGithubReview {
  id: number;
  state: string;
  body: string | null;
  user: RawGithubUser | null;
  submitted_at: string | null;
  html_url: string;
}

interface RawGithubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author?: { name?: string; date?: string } | null;
  };
  author?: { login?: string } | null;
}

function mapUser(u: RawGithubUser | null | undefined): GithubUserDTO | null {
  if (!u) return null;
  return {
    login: u.login,
    avatarUrl: u.avatar_url,
    htmlUrl: u.html_url,
  };
}

function mapPrSummary(raw: RawGithubPr): GithubPullRequestSummaryDTO {
  return {
    number: raw.number,
    title: raw.title,
    state: raw.state,
    draft: Boolean(raw.draft),
    merged: Boolean(raw.merged || raw.merged_at),
    htmlUrl: raw.html_url,
    user: mapUser(raw.user),
    headRef: raw.head?.ref ?? "",
    headSha: raw.head?.sha ?? "",
    baseRef: raw.base?.ref ?? "",
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    mergedAt: raw.merged_at ?? null,
    comments: raw.comments ?? 0,
    reviewComments: raw.review_comments ?? 0,
    labels: (raw.labels ?? [])
      .filter((l) => Boolean(l.name))
      .map((l) => ({
        name: l.name!,
        color: l.color || "3f3f46",
      })),
  };
}

function parseRepo(repoUrl: string) {
  try {
    return parseGithubRepoUrl(repoUrl);
  } catch (err) {
    throw new GithubApiError(
      err instanceof Error ? err.message : "Invalid GitHub repository URL",
      400
    );
  }
}

export async function listPullRequests(options: {
  repoUrl: string;
  state?: "open" | "closed" | "all";
}): Promise<GithubPullRequestSummaryDTO[]> {
  const { owner, repo } = parseRepo(options.repoUrl);
  const token = getOptionalGithubToken();
  const state = options.state ?? "open";

  const resp = await githubRequest<RawGithubPr[]>(
    `/repos/${owner}/${repo}/pulls?state=${encodeURIComponent(state)}&sort=updated&direction=desc&per_page=50`,
    token,
    {
      permissionHint:
        "Ensure GITHUB_TOKEN has Pull requests: Read access to this repository.",
    }
  );

  return resp.data.map(mapPrSummary);
}

export async function getPullRequestDetail(options: {
  repoUrl: string;
  pullNumber: number;
}): Promise<GithubPullRequestDetailDTO> {
  const { owner, repo } = parseRepo(options.repoUrl);
  const token = getOptionalGithubToken();
  const prNum = options.pullNumber;

  const [prResp, filesResp, issueCommentsResp, reviewCommentsResp, reviewsResp, commitsResp] =
    await Promise.all([
      githubRequest<RawGithubPr>(`/repos/${owner}/${repo}/pulls/${prNum}`, token),
      githubRequest<RawGithubPrFile[]>(
        `/repos/${owner}/${repo}/pulls/${prNum}/files?per_page=100`,
        token
      ),
      githubRequest<RawGithubIssueComment[]>(
        `/repos/${owner}/${repo}/issues/${prNum}/comments?per_page=100`,
        token
      ),
      githubRequest<RawGithubReviewComment[]>(
        `/repos/${owner}/${repo}/pulls/${prNum}/comments?per_page=100`,
        token
      ),
      githubRequest<RawGithubReview[]>(
        `/repos/${owner}/${repo}/pulls/${prNum}/reviews?per_page=100`,
        token
      ),
      githubRequest<RawGithubCommit[]>(
        `/repos/${owner}/${repo}/pulls/${prNum}/commits?per_page=50`,
        token
      ),
    ]);

  const raw = prResp.data;
  const summary = mapPrSummary(raw);

  const files: GithubPullRequestFileDTO[] = filesResp.data.map((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    changes: f.changes,
    patch: f.patch ?? null,
    previousFilename: f.previous_filename ?? null,
  }));

  const commentsList: GithubPullRequestCommentDTO[] = [
    ...issueCommentsResp.data.map((c) => ({
      id: c.id,
      body: c.body ?? "",
      user: mapUser(c.user),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      htmlUrl: c.html_url,
      path: null,
      line: null,
      isReviewComment: false,
    })),
    ...reviewCommentsResp.data.map((c) => ({
      id: c.id,
      body: c.body ?? "",
      user: mapUser(c.user),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      htmlUrl: c.html_url,
      path: c.path ?? null,
      line: c.line ?? c.original_line ?? null,
      isReviewComment: true,
    })),
  ].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const reviews: GithubPullRequestReviewDTO[] = reviewsResp.data.map((r) => ({
    id: r.id,
    state: r.state,
    body: r.body ?? "",
    user: mapUser(r.user),
    submittedAt: r.submitted_at ?? null,
    htmlUrl: r.html_url,
  }));

  const commits: GithubPullRequestCommitDTO[] = commitsResp.data.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    authorName: c.author?.login || c.commit.author?.name || "Unknown",
    date: c.commit.author?.date ?? null,
    htmlUrl: c.html_url,
  }));

  return {
    ...summary,
    body: raw.body ?? "",
    additions: raw.additions ?? 0,
    deletions: raw.deletions ?? 0,
    changedFiles: raw.changed_files ?? files.length,
    commitsCount: raw.commits ?? commits.length,
    mergeable: raw.mergeable ?? null,
    mergeableState: raw.mergeable_state ?? null,
    files,
    commentsList,
    reviews,
    commits,
  };
}

export async function submitPullRequestReview(options: {
  repoUrl: string;
  pullNumber: number;
  event: PrReviewEvent;
  body?: string;
}): Promise<GithubPullRequestReviewDTO> {
  const token = requireGithubToken("submit pull request reviews");
  const { owner, repo } = parseRepo(options.repoUrl);

  if (
    (options.event === "REQUEST_CHANGES" || options.event === "COMMENT") &&
    !options.body?.trim()
  ) {
    throw new GithubApiError(
      options.event === "REQUEST_CHANGES"
        ? "Please include review feedback when requesting changes."
        : "Please include a comment body for a review comment.",
      400
    );
  }

  const resp = await githubRequest<RawGithubReview>(
    `/repos/${owner}/${repo}/pulls/${options.pullNumber}/reviews`,
    token,
    {
      method: "POST",
      permissionHint:
        "Ensure GITHUB_TOKEN has Pull requests: Read & Write access.",
      body: JSON.stringify({
        event: options.event,
        body: options.body?.trim() || undefined,
      }),
    }
  );

  return {
    id: resp.data.id,
    state: resp.data.state,
    body: resp.data.body ?? "",
    user: mapUser(resp.data.user),
    submittedAt: resp.data.submitted_at ?? null,
    htmlUrl: resp.data.html_url,
  };
}

export async function createPullRequestComment(options: {
  repoUrl: string;
  pullNumber: number;
  body: string;
}): Promise<GithubPullRequestCommentDTO> {
  const token = requireGithubToken("comment on pull requests");
  const { owner, repo } = parseRepo(options.repoUrl);

  const resp = await githubRequest<RawGithubIssueComment>(
    `/repos/${owner}/${repo}/issues/${options.pullNumber}/comments`,
    token,
    {
      method: "POST",
      permissionHint:
        "Ensure GITHUB_TOKEN has Pull requests: Read & Write (or Issues: Read & Write) access.",
      body: JSON.stringify({ body: options.body.trim() }),
    }
  );

  return {
    id: resp.data.id,
    body: resp.data.body ?? "",
    user: mapUser(resp.data.user),
    createdAt: resp.data.created_at,
    updatedAt: resp.data.updated_at,
    htmlUrl: resp.data.html_url,
    path: null,
    line: null,
    isReviewComment: false,
  };
}

export async function mergePullRequest(options: {
  repoUrl: string;
  pullNumber: number;
  mergeMethod?: PrMergeMethod;
  commitTitle?: string;
  commitMessage?: string;
}): Promise<MergePrResultDTO> {
  const token = requireGithubToken("merge pull requests");
  const { owner, repo } = parseRepo(options.repoUrl);

  const resp = await githubRequest<{
    merged: boolean;
    sha: string;
    message: string;
  }>(`/repos/${owner}/${repo}/pulls/${options.pullNumber}/merge`, token, {
    method: "PUT",
    permissionHint:
      "Ensure GITHUB_TOKEN has Pull requests: Read & Write and Contents: Read & Write access.",
    body: JSON.stringify({
      merge_method: options.mergeMethod ?? "squash",
      ...(options.commitTitle ? { commit_title: options.commitTitle } : {}),
      ...(options.commitMessage
        ? { commit_message: options.commitMessage }
        : {}),
    }),
  });

  return {
    merged: resp.data.merged,
    sha: resp.data.sha,
    message: resp.data.message,
  };
}
