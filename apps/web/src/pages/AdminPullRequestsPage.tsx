import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileDiff,
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  MessageSquare,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import type {
  GithubPullRequestDetailDTO,
  GithubPullRequestFileDTO,
  GithubPullRequestSummaryDTO,
  GithubRepoSuggestionDTO,
  GithubStatusDTO,
  PrMergeMethod,
  PrReviewEvent,
} from "@repo/shared";
import { api } from "../lib/api";
import { MarkdownContent } from "../components/MarkdownContent";

function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

function PrStateBadge({
  pr,
}: {
  pr: Pick<GithubPullRequestSummaryDTO, "state" | "draft" | "merged">;
}) {
  if (pr.merged) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-violet-700/70 bg-violet-950/70 px-2 py-0.5 text-[11px] font-semibold text-violet-300">
        <GitMerge className="h-3 w-3" />
        Merged
      </span>
    );
  }
  if (pr.state === "closed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-800/70 bg-red-950/70 px-2 py-0.5 text-[11px] font-semibold text-red-300">
        <GitPullRequestClosed className="h-3 w-3" />
        Closed
      </span>
    );
  }
  if (pr.draft) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
        <GitPullRequest className="h-3 w-3" />
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/70 bg-emerald-950/70 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
      <GitPullRequest className="h-3 w-3" />
      Open
    </span>
  );
}

function ReviewStateBadge({ state }: { state: string }) {
  const upper = state.toUpperCase();
  if (upper === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/70 bg-emerald-950/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </span>
    );
  }
  if (upper === "CHANGES_REQUESTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-800/70 bg-red-950/70 px-2 py-0.5 text-[10px] font-semibold text-red-300">
        <XCircle className="h-3 w-3" />
        Changes Requested
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
      <MessageSquare className="h-3 w-3" />
      {upper === "COMMENTED" ? "Commented" : upper}
    </span>
  );
}

function DiffFileCard({
  file,
  expanded,
  onToggle,
}: {
  file: GithubPullRequestFileDTO;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusColor =
    file.status === "added"
      ? "text-emerald-300 bg-emerald-950/70 border-emerald-800/70"
      : file.status === "removed"
        ? "text-red-300 bg-red-950/70 border-red-800/70"
        : file.status === "renamed"
          ? "text-sky-300 bg-sky-950/70 border-sky-800/70"
          : "text-amber-300 bg-amber-950/70 border-amber-800/70";

  const lines = useMemo(
    () => (file.patch ? file.patch.split("\n") : []),
    [file.patch]
  );

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 bg-zinc-900/70 px-3.5 py-2.5 text-left transition hover:bg-zinc-900"
      >
        <div className="flex min-w-0 items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
          )}
          <span
            className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${statusColor}`}
          >
            {file.status}
          </span>
          <span className="truncate font-mono text-xs text-zinc-200">
            {file.previousFilename
              ? `${file.previousFilename} → ${file.filename}`
              : file.filename}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
          <span className="text-emerald-400">+{file.additions}</span>
          <span className="text-red-400">-{file.deletions}</span>
        </div>
      </button>

      {expanded && (
        <div className="overflow-x-auto border-t border-zinc-800 font-mono text-[11px] leading-5">
          {!file.patch ? (
            <div className="px-4 py-3 font-sans text-xs text-zinc-500">
              No text diff available (binary file or diff too large to display).
            </div>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, idx) => {
                  const isHunk = line.startsWith("@@");
                  const isAdd = !isHunk && line.startsWith("+");
                  const isDel = !isHunk && line.startsWith("-");
                  return (
                    <tr
                      key={idx}
                      className={
                        isHunk
                          ? "bg-sky-950/40 text-sky-300"
                          : isAdd
                            ? "bg-emerald-950/35 text-emerald-200"
                            : isDel
                              ? "bg-red-950/35 text-red-200"
                              : "text-zinc-300"
                      }
                    >
                      <td className="w-10 select-none border-r border-zinc-800/70 px-2 text-right text-zinc-600">
                        {idx + 1}
                      </td>
                      <td className="px-3 whitespace-pre">{line || " "}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminPullRequestsPage() {
  const [githubStatus, setGithubStatus] = useState<GithubStatusDTO | null>(
    null
  );
  const [suggestedRepos, setSuggestedRepos] = useState<
    GithubRepoSuggestionDTO[]
  >([]);
  const [repoInput, setRepoInput] = useState("");
  const [activeRepoUrl, setActiveRepoUrl] = useState("");
  const [stateFilter, setStateFilter] = useState<"open" | "closed" | "all">(
    "open"
  );

  const [prs, setPrs] = useState<GithubPullRequestSummaryDTO[]>([]);
  const [loadingPrs, setLoadingPrs] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedPrNumber, setSelectedPrNumber] = useState<number | null>(null);
  const [prDetail, setPrDetail] = useState<GithubPullRequestDetailDTO | null>(
    null
  );
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [detailTab, setDetailTab] = useState<"conversation" | "files">(
    "conversation"
  );
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Review & comment state
  const [reviewBody, setReviewBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [mergeMethod, setMergeMethod] = useState<PrMergeMethod>("squash");
  const [merging, setMerging] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchPrList = useCallback(
    async (repoUrl: string, state: "open" | "closed" | "all") => {
      if (!repoUrl.trim()) return;
      setLoadingPrs(true);
      setListError(null);
      try {
        const list = await api.getGithubPullRequests(repoUrl.trim(), state);
        setPrs(list);
        setSelectedPrNumber((prev) => {
          if (prev && list.some((p) => p.number === prev)) return prev;
          return list[0]?.number ?? null;
        });
      } catch (err) {
        setPrs([]);
        setSelectedPrNumber(null);
        setPrDetail(null);
        setListError(
          err instanceof Error ? err.message : "Failed to load pull requests"
        );
      } finally {
        setLoadingPrs(false);
      }
    },
    []
  );

  const fetchPrDetail = useCallback(
    async (repoUrl: string, pullNumber: number) => {
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const detail = await api.getGithubPullRequestDetail(
          repoUrl,
          pullNumber
        );
        setPrDetail(detail);
        setExpandedFiles(
          new Set(detail.files.slice(0, 12).map((f) => f.filename))
        );
      } catch (err) {
        setPrDetail(null);
        setDetailError(
          err instanceof Error
            ? err.message
            : "Failed to load pull request details"
        );
      } finally {
        setLoadingDetail(false);
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.getGithubStatus().catch(() => null),
      api.getGithubRepos().catch(() => [] as GithubRepoSuggestionDTO[]),
    ]).then(([status, repos]) => {
      if (!mounted) return;
      setGithubStatus(status);
      setSuggestedRepos(repos);
      const initialRepo =
        status?.defaultRepoUrl || repos[0]?.repoUrl || "";
      if (initialRepo) {
        setRepoInput(initialRepo);
        setActiveRepoUrl(initialRepo);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeRepoUrl) {
      void fetchPrList(activeRepoUrl, stateFilter);
    }
  }, [activeRepoUrl, stateFilter, fetchPrList]);

  useEffect(() => {
    if (activeRepoUrl && selectedPrNumber !== null) {
      setActionFeedback(null);
      void fetchPrDetail(activeRepoUrl, selectedPrNumber);
    } else {
      setPrDetail(null);
    }
  }, [activeRepoUrl, selectedPrNumber, fetchPrDetail]);

  const handleRepoSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = repoInput.trim();
    if (!trimmed) return;
    if (trimmed === activeRepoUrl) {
      void fetchPrList(trimmed, stateFilter);
    } else {
      setActiveRepoUrl(trimmed);
    }
  };

  const handleSubmitReview = async (event: PrReviewEvent) => {
    if (!prDetail || !activeRepoUrl) return;
    setActionFeedback(null);
    setSubmittingReview(true);
    try {
      await api.submitGithubPrReview(prDetail.number, {
        repoUrl: activeRepoUrl,
        event,
        body: reviewBody.trim(),
      });
      setReviewBody("");
      setActionFeedback({
        type: "success",
        message:
          event === "APPROVE"
            ? `Approved PR #${prDetail.number}`
            : event === "REQUEST_CHANGES"
              ? `Requested changes on PR #${prDetail.number}`
              : `Posted review comment on PR #${prDetail.number}`,
      });
      await fetchPrDetail(activeRepoUrl, prDetail.number);
    } catch (err) {
      setActionFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to submit review",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!prDetail || !activeRepoUrl || !commentBody.trim()) return;
    setActionFeedback(null);
    setSubmittingComment(true);
    try {
      await api.createGithubPrComment(prDetail.number, {
        repoUrl: activeRepoUrl,
        body: commentBody.trim(),
      });
      setCommentBody("");
      setActionFeedback({
        type: "success",
        message: `Added comment to PR #${prDetail.number}`,
      });
      await fetchPrDetail(activeRepoUrl, prDetail.number);
    } catch (err) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to post comment",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleMergePr = async () => {
    if (!prDetail || !activeRepoUrl) return;
    if (
      !window.confirm(
        `Merge PR #${prDetail.number} ("${prDetail.title}") using ${mergeMethod}?`
      )
    ) {
      return;
    }
    setActionFeedback(null);
    setMerging(true);
    try {
      const res = await api.mergeGithubPr(prDetail.number, {
        repoUrl: activeRepoUrl,
        mergeMethod,
      });
      setActionFeedback({
        type: "success",
        message: res.message || `Merged PR #${prDetail.number}`,
      });
      await Promise.all([
        fetchPrDetail(activeRepoUrl, prDetail.number),
        fetchPrList(activeRepoUrl, stateFilter),
      ]);
    } catch (err) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to merge PR",
      });
    } finally {
      setMerging(false);
    }
  };

  const toggleFile = (filename: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* Header & Repo selector */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5 text-emerald-400" />
              <h1 className="text-xl font-bold text-zinc-100">
                Pull Request Review
              </h1>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Inspect diffs, post feedback, approve, request changes, or merge
              student PRs directly from the admin panel.
            </p>
          </div>
          {activeRepoUrl && (
            <button
              type="button"
              onClick={() => void fetchPrList(activeRepoUrl, stateFilter)}
              disabled={loadingPrs}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-emerald-700 hover:text-emerald-300 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingPrs ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          )}
        </div>

        {githubStatus && !githubStatus.configured && (
          <div className="mt-4 rounded-xl border border-amber-800/60 bg-amber-950/40 px-4 py-2.5 text-xs text-amber-200">
            <strong>GITHUB_TOKEN</strong> is not configured on the API server.
            You can browse public repository PRs, but submitting reviews,
            comments, or merging requires a GitHub Personal Access Token (with{" "}
            <code>Pull requests: Read &amp; Write</code>) in{" "}
            <code>apps/api/.env</code>.
          </div>
        )}

        <form
          onSubmit={handleRepoSubmit}
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
            <GitBranch className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="https://github.com/owner/repo or owner/repo"
              className="w-full bg-transparent font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!repoInput.trim() || loadingPrs}
            className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-emerald-50 hover:bg-emerald-700 disabled:opacity-50"
          >
            Load PRs
          </button>

          <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1 text-xs">
            {(["open", "closed", "all"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStateFilter(st)}
                className={`rounded-md px-2.5 py-1 capitalize transition ${
                  stateFilter === st
                    ? "bg-zinc-800 font-semibold text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </form>

        {suggestedRepos.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-zinc-500">
              Linked repos:
            </span>
            {suggestedRepos.map((r) => (
              <button
                key={r.repoUrl}
                type="button"
                onClick={() => {
                  setRepoInput(r.repoUrl);
                  setActiveRepoUrl(r.repoUrl);
                }}
                className={`rounded-md border px-2 py-0.5 font-mono text-[11px] transition ${
                  activeRepoUrl === r.repoUrl
                    ? "border-emerald-700 bg-emerald-950/70 text-emerald-200"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                {r.owner}/{r.repo}
              </button>
            ))}
          </div>
        )}
      </div>

      {listError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-900/60 bg-red-950/50 p-4 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{listError}</span>
        </div>
      )}

      {!activeRepoUrl ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
          <GitPullRequest className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-2 font-medium text-zinc-200">
            Enter a GitHub repository above to review Pull Requests
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Tip: Set <code>GITHUB_DEFAULT_REPO</code> in{" "}
            <code>apps/api/.env</code> to load your class repository
            automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
          {/* Left column: PR list */}
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Pull Requests ({prs.length})
              </span>
            </div>

            {loadingPrs ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : prs.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No {stateFilter === "all" ? "" : stateFilter} pull requests
                found.
              </div>
            ) : (
              <div className="max-h-[75vh] divide-y divide-zinc-800/80 overflow-y-auto">
                {prs.map((pr) => {
                  const isSelected = pr.number === selectedPrNumber;
                  return (
                    <button
                      key={pr.number}
                      type="button"
                      onClick={() => setSelectedPrNumber(pr.number)}
                      className={`w-full p-3.5 text-left transition ${
                        isSelected
                          ? "bg-emerald-950/40 ring-1 ring-inset ring-emerald-800/60"
                          : "hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-xs text-zinc-400">
                          #{pr.number}
                        </span>
                        <PrStateBadge pr={pr} />
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-zinc-100">
                        {pr.title}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                        {pr.user && (
                          <span className="inline-flex items-center gap-1">
                            <img
                              src={pr.user.avatarUrl}
                              alt={pr.user.login}
                              className="h-4 w-4 rounded-full"
                            />
                            {pr.user.login}
                          </span>
                        )}
                        <span>•</span>
                        <span>{formatRelativeDate(pr.updatedAt)}</span>
                        {pr.comments + pr.reviewComments > 0 && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-0.5">
                              <MessageSquare className="h-3 w-3" />
                              {pr.comments + pr.reviewComments}
                            </span>
                          </>
                        )}
                      </div>
                      {pr.labels.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {pr.labels.map((label) => (
                            <span
                              key={label.name}
                              style={{
                                borderColor: `#${label.color}88`,
                                backgroundColor: `#${label.color}22`,
                              }}
                              className="rounded border px-1.5 py-0.2 text-[10px] font-medium text-zinc-200"
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column: PR Detail & Review */}
          <div className="min-w-0 space-y-4">
            {loadingDetail ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/80">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
              </div>
            ) : detailError ? (
              <div className="rounded-2xl border border-red-900/60 bg-red-950/50 p-6 text-sm text-red-300">
                {detailError}
              </div>
            ) : !prDetail ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-500">
                Select a pull request on the left to inspect its diff and submit
                a review.
              </div>
            ) : (
              <>
                {/* PR Header Card */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <PrStateBadge pr={prDetail} />
                        <span className="font-mono text-xs text-zinc-400">
                          #{prDetail.number}
                        </span>
                        <span className="rounded bg-zinc-950 px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                          {prDetail.headRef} → {prDetail.baseRef}
                        </span>
                      </div>
                      <h2 className="mt-2 text-lg font-bold text-zinc-100">
                        {prDetail.title}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                        {prDetail.user && (
                          <a
                            href={prDetail.user.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 hover:text-zinc-200"
                          >
                            <img
                              src={prDetail.user.avatarUrl}
                              alt={prDetail.user.login}
                              className="h-4 w-4 rounded-full"
                            />
                            <span className="font-medium text-zinc-200">
                              {prDetail.user.login}
                            </span>
                          </a>
                        )}
                        <span>
                          updated {formatRelativeDate(prDetail.updatedAt)}
                        </span>
                        <span className="font-mono text-emerald-400">
                          +{prDetail.additions}
                        </span>
                        <span className="font-mono text-red-400">
                          -{prDetail.deletions}
                        </span>
                        <span>
                          {prDetail.changedFiles}{" "}
                          {prDetail.changedFiles === 1 ? "file" : "files"}
                        </span>
                        <span>
                          {prDetail.commitsCount}{" "}
                          {prDetail.commitsCount === 1 ? "commit" : "commits"}
                        </span>
                      </div>
                    </div>

                    <a
                      href={prDetail.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-emerald-700 hover:text-emerald-300"
                    >
                      Open on GitHub
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* Detail Tabs */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDetailTab("conversation")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          detailTab === "conversation"
                            ? "bg-zinc-800 text-zinc-100"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Conversation (
                        {prDetail.commentsList.length + prDetail.reviews.length}
                        )
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailTab("files")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          detailTab === "files"
                            ? "bg-zinc-800 text-zinc-100"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <FileDiff className="h-3.5 w-3.5" />
                        Files Changed ({prDetail.files.length})
                      </button>
                    </div>

                    {detailTab === "files" && prDetail.files.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedFiles(
                              new Set(prDetail.files.map((f) => f.filename))
                            )
                          }
                          className="text-zinc-400 hover:text-zinc-200"
                        >
                          Expand all
                        </button>
                        <span className="text-zinc-700">|</span>
                        <button
                          type="button"
                          onClick={() => setExpandedFiles(new Set())}
                          className="text-zinc-400 hover:text-zinc-200"
                        >
                          Collapse all
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {actionFeedback && (
                  <div
                    className={`rounded-xl border px-4 py-2.5 text-xs ${
                      actionFeedback.type === "success"
                        ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-200"
                        : "border-red-900/60 bg-red-950/50 text-red-300"
                    }`}
                  >
                    {actionFeedback.message}
                  </div>
                )}

                {detailTab === "conversation" ? (
                  <div className="space-y-4">
                    {/* PR Description */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
                      <h3 className="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                        Description
                      </h3>
                      {prDetail.body.trim() ? (
                        <MarkdownContent content={prDetail.body} />
                      ) : (
                        <p className="text-xs italic text-zinc-500">
                          No description provided.
                        </p>
                      )}
                    </div>

                    {/* Commits */}
                    {prDetail.commits.length > 0 && (
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                        <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                          <GitCommitHorizontal className="h-4 w-4 text-emerald-400" />
                          Commits ({prDetail.commits.length})
                        </h3>
                        <div className="divide-y divide-zinc-800/70">
                          {prDetail.commits.map((c) => (
                            <div
                              key={c.sha}
                              className="flex items-center justify-between gap-3 py-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-zinc-200">
                                  {c.message.split("\n")[0]}
                                </p>
                                <p className="text-[11px] text-zinc-500">
                                  {c.authorName}
                                  {c.date
                                    ? ` • ${formatRelativeDate(c.date)}`
                                    : ""}
                                </p>
                              </div>
                              <a
                                href={c.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 rounded bg-zinc-950 px-2 py-0.5 font-mono text-[11px] text-emerald-400 hover:underline"
                              >
                                {c.sha.slice(0, 7)}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reviews & Comments */}
                    {(prDetail.reviews.length > 0 ||
                      prDetail.commentsList.length > 0) && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                          Reviews &amp; Comments
                        </h3>
                        {prDetail.reviews.map((rev) => (
                          <div
                            key={`rev-${rev.id}`}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-xs">
                                {rev.user && (
                                  <img
                                    src={rev.user.avatarUrl}
                                    alt={rev.user.login}
                                    className="h-5 w-5 rounded-full"
                                  />
                                )}
                                <span className="font-semibold text-zinc-200">
                                  {rev.user?.login ?? "Reviewer"}
                                </span>
                                <ReviewStateBadge state={rev.state} />
                              </div>
                              <span className="text-[11px] text-zinc-500">
                                {formatRelativeDate(rev.submittedAt)}
                              </span>
                            </div>
                            {rev.body.trim() && (
                              <div className="mt-2.5 text-sm">
                                <MarkdownContent content={rev.body} />
                              </div>
                            )}
                          </div>
                        ))}

                        {prDetail.commentsList.map((c) => (
                          <div
                            key={`c-${c.isReviewComment ? "r" : "i"}-${c.id}`}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                {c.user && (
                                  <img
                                    src={c.user.avatarUrl}
                                    alt={c.user.login}
                                    className="h-5 w-5 rounded-full"
                                  />
                                )}
                                <span className="font-semibold text-zinc-200">
                                  {c.user?.login ?? "User"}
                                </span>
                                {c.path && (
                                  <span className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                                    {c.path}
                                    {c.line ? `:${c.line}` : ""}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-zinc-500">
                                {formatRelativeDate(c.createdAt)}
                              </span>
                            </div>
                            <div className="mt-2.5 text-sm">
                              <MarkdownContent content={c.body} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Comment Box */}
                    <form
                      onSubmit={handleAddComment}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"
                    >
                      <label className="block text-xs font-semibold text-zinc-300">
                        Add Conversation Comment
                      </label>
                      <textarea
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        rows={3}
                        placeholder="Leave a comment on this pull request (Markdown supported)..."
                        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                      />
                      <div className="mt-2.5 flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingComment || !commentBody.trim()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {submittingComment ? "Posting..." : "Comment"}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prDetail.files.length === 0 ? (
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-xs text-zinc-500">
                        No changed files found in this pull request.
                      </div>
                    ) : (
                      prDetail.files.map((file) => (
                        <DiffFileCard
                          key={file.filename}
                          file={file}
                          expanded={expandedFiles.has(file.filename)}
                          onToggle={() => toggleFile(file.filename)}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* Submit Review & Merge Panel */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5">
                  <h3 className="text-sm font-bold text-zinc-100">
                    Submit Admin Review
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Approve, request changes, or leave review feedback directly
                    on GitHub.
                  </p>
                  <textarea
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    rows={3}
                    placeholder="Write your review feedback (required for Request Changes or Comment)..."
                    className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={submittingReview}
                        onClick={() => void handleSubmitReview("APPROVE")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-emerald-50 hover:bg-emerald-600 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={submittingReview || !reviewBody.trim()}
                        onClick={() =>
                          void handleSubmitReview("REQUEST_CHANGES")
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-800/70 bg-red-950/70 px-3.5 py-2 text-xs font-semibold text-red-200 hover:bg-red-900/70 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Request Changes
                      </button>
                      <button
                        type="button"
                        disabled={submittingReview || !reviewBody.trim()}
                        onClick={() => void handleSubmitReview("COMMENT")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Review Comment
                      </button>
                    </div>

                    {prDetail.state === "open" && !prDetail.merged && (
                      <div className="flex items-center gap-2 border-t border-zinc-800 pt-3 sm:border-t-0 sm:pt-0">
                        <select
                          aria-label="Merge method"
                          value={mergeMethod}
                          onChange={(e) =>
                            setMergeMethod(e.target.value as PrMergeMethod)
                          }
                          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-200 focus:border-emerald-600 focus:outline-none"
                        >
                          <option value="squash">Squash &amp; merge</option>
                          <option value="merge">Merge commit</option>
                          <option value="rebase">Rebase &amp; merge</option>
                        </select>
                        <button
                          type="button"
                          disabled={merging || prDetail.draft}
                          onClick={() => void handleMergePr()}
                          title={
                            prDetail.draft
                              ? "Draft PRs cannot be merged"
                              : "Merge this pull request"
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3.5 py-2 text-xs font-semibold text-violet-50 hover:bg-violet-600 disabled:opacity-50"
                        >
                          <GitMerge className="h-3.5 w-3.5" />
                          {merging ? "Merging..." : "Merge PR"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
