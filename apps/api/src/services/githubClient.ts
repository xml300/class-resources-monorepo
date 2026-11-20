import { env } from "../env.js";

export class GithubApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "GithubApiError";
    this.status = status;
  }
}

const GITHUB_API_BASE = "https://api.github.com";

export function getOptionalGithubToken(): string | null {
  const token = env.GITHUB_TOKEN.trim();
  return token.length > 0 ? token : null;
}

export function requireGithubToken(actionDescription: string): string {
  const token = getOptionalGithubToken();
  if (!token) {
    throw new GithubApiError(
      `GITHUB_TOKEN is not configured on the server. Add a GitHub Personal Access Token to apps/api/.env to ${actionDescription}.`,
      400
    );
  }
  return token;
}

export async function githubRequest<T>(
  endpoint: string,
  token: string | null,
  init?: RequestInit & { permissionHint?: string }
): Promise<{ status: number; data: T }> {
  const { permissionHint, ...fetchInit } = init ?? {};
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "class-resources-monorepo",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchInit.body ? { "Content-Type": "application/json" } : {}),
  };

  if (fetchInit.headers) {
    const extra = fetchInit.headers as Record<string, string>;
    Object.assign(headers, extra);
  }

  const res = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...fetchInit,
    headers,
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

    const errorsDetail =
      typeof parsed === "object" &&
      parsed !== null &&
      "errors" in parsed &&
      Array.isArray((parsed as { errors?: unknown }).errors)
        ? (parsed as { errors: Array<{ message?: string }> }).errors
            .map((e) => e?.message)
            .filter(Boolean)
            .join("; ")
        : "";

    const fullMsg = errorsDetail ? `${msg}: ${errorsDetail}` : msg;

    if (res.status === 401) {
      throw new GithubApiError(
        `GitHub authentication failed (${fullMsg}). Check GITHUB_TOKEN in apps/api/.env.`,
        401
      );
    }
    if (res.status === 403) {
      const hint =
        permissionHint ||
        (token
          ? "Ensure GITHUB_TOKEN has the required repository permissions."
          : "Configure GITHUB_TOKEN in apps/api/.env for private repos or higher rate limits.");
      throw new GithubApiError(`GitHub permission denied (${fullMsg}). ${hint}`, 403);
    }
    if (res.status === 404) {
      throw new GithubApiError(
        `GitHub resource not found (${fullMsg}). Verify the repository URL, branch, PR number, and token access.`,
        404
      );
    }

    throw new GithubApiError(`GitHub API error: ${fullMsg}`, res.status);
  }

  return { status: res.status, data: parsed as T };
}

export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
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
