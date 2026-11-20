import { useState, type FormEvent } from "react";
import { CheckCircle2, ExternalLink, GitBranch, UploadCloud, X } from "lucide-react";
import type {
  GithubStatusDTO,
  PushToGithubResultDTO,
  ResourceDTO,
} from "@repo/shared";
import { api } from "../lib/api";
import { slugifyFolderName } from "../lib/folderUpload";

interface PushToGithubModalProps {
  resource: ResourceDTO;
  dayNumber: number;
  githubStatus: GithubStatusDTO | null;
  onClose: () => void;
  onPushed: (result: PushToGithubResultDTO) => void;
}

export function PushToGithubModal({
  resource,
  dayNumber,
  githubStatus,
  onClose,
  onPushed,
}: PushToGithubModalProps) {
  const defaultSlug = slugifyFolderName(resource.title) || "code-folder";
  const [repoUrl, setRepoUrl] = useState(
    resource.githubRepoUrl ?? githubStatus?.defaultRepoUrl ?? ""
  );
  const [branch, setBranch] = useState(
    resource.githubBranch ?? githubStatus?.defaultBranch ?? "main"
  );
  const [targetPath, setTargetPath] = useState(
    resource.githubPath ?? `day-${String(dayNumber).padStart(2, "0")}/${defaultSlug}`
  );
  const [commitMessage, setCommitMessage] = useState(
    `Day ${dayNumber}: ${resource.title}`
  );
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PushToGithubResultDTO | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPushing(true);
    try {
      const pushed = await api.pushResourceToGithub(resource.id, {
        repoUrl: repoUrl.trim(),
        branch: branch.trim() || undefined,
        targetPath: targetPath.trim(),
        commitMessage: commitMessage.trim() || undefined,
      });
      setResult(pushed);
      onPushed(pushed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to push to GitHub"
      );
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-zinc-100">Push to GitHub</h2>
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
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2.5 text-xs text-zinc-300">
            <span className="font-semibold text-zinc-100">{resource.title}</span>
            <span className="text-zinc-500">
              {" "}
              •{" "}
              {(resource.fileCount ?? 0) > 0
                ? `${resource.fileCount} files`
                : "1 code snippet"}
            </span>
          </div>

          {githubStatus && !githubStatus.configured && (
            <div className="rounded-xl border border-amber-800/60 bg-amber-950/40 px-3.5 py-2.5 text-xs text-amber-200">
              <strong>GITHUB_TOKEN</strong> is not configured on the API server.
              Add a fine-grained GitHub Personal Access Token (with{" "}
              <code>Contents: Read &amp; Write</code>) to{" "}
              <code>apps/api/.env</code> and restart the API to enable pushing.
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
                Pushed {result.filesPushed}{" "}
                {result.filesPushed === 1 ? "file" : "files"} to{" "}
                {result.owner}/{result.repo} ({result.branch})
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <a
                  href={result.folderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-emerald-300 underline hover:text-emerald-200"
                >
                  Open folder on GitHub
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
              placeholder="https://github.com/owner/repo"
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

          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Commit Message
            </label>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder={`Day ${dayNumber}: ${resource.title}`}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Pushing cleanly replaces the target folder contents in a single
              commit without touching other folders in the repo.
            </p>
          </div>

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
              disabled={pushing || !repoUrl.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-700 disabled:opacity-50"
            >
              <UploadCloud className="h-4 w-4" />
              {pushing ? "Pushing..." : "Push to GitHub"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
