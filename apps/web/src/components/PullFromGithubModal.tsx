import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  DownloadCloud,
  ExternalLink,
  GitBranch,
  X,
} from "lucide-react";
import type {
  GithubStatusDTO,
  PullFromGithubResultDTO,
  ResourceDTO,
} from "@repo/shared";
import { api } from "../lib/api";

interface PullFromGithubModalProps {
  /** When provided, syncs into this existing resource. Otherwise creates a new CODE resource under dayId. */
  resource?: ResourceDTO | null;
  dayId: string;
  dayNumber: number;
  githubStatus: GithubStatusDTO | null;
  onClose: () => void;
  onPulled: (result: PullFromGithubResultDTO) => void;
}

export function PullFromGithubModal({
  resource,
  dayId,
  dayNumber,
  githubStatus,
  onClose,
  onPulled,
}: PullFromGithubModalProps) {
  const isSyncExisting = Boolean(resource);

  const [title, setTitle] = useState(resource?.title ?? "");
  const [description, setDescription] = useState(resource?.description ?? "");
  const [repoUrl, setRepoUrl] = useState(
    resource?.githubRepoUrl ?? githubStatus?.defaultRepoUrl ?? ""
  );
  const [branch, setBranch] = useState(
    resource?.githubBranch ?? githubStatus?.defaultBranch ?? "main"
  );
  const [targetPath, setTargetPath] = useState(resource?.githubPath ?? "");
  const [runCommand, setRunCommand] = useState(resource?.runCommand ?? "");
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PullFromGithubResultDTO | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPulling(true);
    try {
      let pulled: PullFromGithubResultDTO;
      if (resource) {
        pulled = await api.pullResourceFromGithub(resource.id, {
          repoUrl: repoUrl.trim(),
          branch: branch.trim() || undefined,
          targetPath: targetPath.trim(),
        });
      } else {
        pulled = await api.importGithubResource(dayId, {
          title: title.trim() || undefined,
          description: description.trim() || null,
          repoUrl: repoUrl.trim(),
          branch: branch.trim() || undefined,
          targetPath: targetPath.trim(),
          runCommand: runCommand.trim() || null,
          publishedAt: new Date().toISOString(),
        });
      }
      setResult(pulled);
      onPulled(pulled);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to pull from GitHub"
      );
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <DownloadCloud className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-zinc-100">
              {isSyncExisting
                ? "Pull & Sync from GitHub"
                : `Import Code Folder from GitHub (Day ${dayNumber})`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {resource && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2.5 text-xs text-zinc-300">
              <span className="font-semibold text-zinc-100">
                {resource.title}
              </span>
              <span className="text-zinc-500">
                {" "}
                • Replaces current folder files with latest commit from GitHub
              </span>
            </div>
          )}

          {githubStatus && !githubStatus.configured && (
            <div className="rounded-xl border border-amber-800/60 bg-amber-950/40 px-3.5 py-2.5 text-xs text-amber-200">
              <strong>GITHUB_TOKEN</strong> is not configured on the API server.
              Public repositories can still be pulled (rate-limited), or add a
              GitHub Personal Access Token to <code>apps/api/.env</code> for
              private repositories.
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-900/60 bg-red-950/50 px-3.5 py-2.5 text-xs text-red-300">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3.5 text-xs text-emerald-200">
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Synced {result.filesPulled}{" "}
                {result.filesPulled === 1 ? "file" : "files"} from{" "}
                {result.owner}/{result.repo} ({result.branch})
              </div>
              {result.skippedCount > 0 && (
                <p className="mt-1 text-[11px] text-emerald-200/80">
                  Skipped {result.skippedCount} ignored/binary{" "}
                  {result.skippedCount === 1 ? "file" : "files"}.
                </p>
              )}
              {result.runCommand && (
                <p className="mt-1 text-[11px] text-emerald-200/80">
                  Run command:{" "}
                  <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-emerald-300">
                    {result.runCommand}
                  </code>
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <a
                  href={result.folderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-emerald-300 underline hover:text-emerald-200"
                >
                  Open on GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={result.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-zinc-300 underline hover:text-zinc-100"
                >
                  {result.commitSha.slice(0, 7)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300">
              GitHub Repository URL
            </label>
            <input
              type="text"
              required
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo or https://github.com/owner/repo/tree/main/folder"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300">
                Folder Path in Repo
              </label>
              <input
                type="text"
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                placeholder="(blank = repo root)"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {!isSyncExisting && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-300">
                    Resource Title (optional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Defaults to folder or repo name"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300">
                    Run Command (optional)
                  </label>
                  <input
                    type="text"
                    value={runCommand}
                    onChange={(e) => setRunCommand(e.target.value)}
                    placeholder="Auto-detected from package.json"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short summary for students"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </>
          )}

          <p className="text-[11px] text-zinc-500">
            Pulling fetches text/code files from the specified GitHub branch and
            folder, automatically skipping <code>node_modules</code>, binaries,
            lockfiles, and secret <code>.env</code> files.
          </p>

          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              {result ? "Done" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={pulling || !repoUrl.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-700 disabled:opacity-50"
            >
              <GitBranch className="h-4 w-4" />
              {pulling
                ? "Pulling..."
                : isSyncExisting
                  ? "Pull & Sync"
                  : "Pull & Create Resource"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
