import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Code2,
  DownloadCloud,
  ExternalLink,
  Eye,
  EyeOff,
  FolderCode,
  FolderUp,
  GitBranch,
  Link2,
  Pencil,
  Plus,
  Terminal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  CODE_LANGUAGES,
  CODE_LANGUAGE_LABELS,
  getPublishStatus,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  type DayWithResourcesDTO,
  type GithubStatusDTO,
  type ResourceDTO,
  type ResourceType,
} from "@repo/shared";
import { api } from "../lib/api";
import { ResourceBadge } from "../components/ResourceBadge";
import {
  PublishControl,
  PublishStatusBadge,
} from "../components/PublishControl";
import { PullFromGithubModal } from "../components/PullFromGithubModal";
import { PushToGithubModal } from "../components/PushToGithubModal";
import {
  formatBytes,
  scanDroppedFolder,
  scanFileListFolder,
  slugifyFolderName,
  type ScannedFolderFile,
  type SkippedFolderFile,
} from "../lib/folderUpload";

interface ResourceFormState {
  title: string;
  description: string;
  type: ResourceType;
  url: string;
  content: string;
  language: string;
  filename: string;
  runCommand: string;
  githubRepoUrl: string;
  githubBranch: string;
  githubPath: string;
  pushToGithubOnSave: boolean;
  codeInputMode: "link" | "paste" | "folder";
  publishedAt: string | null;
}

export function AdminDayResourcesPage() {
  const { id } = useParams<{ id: string }>();
  const [day, setDay] = useState<DayWithResourcesDTO | null>(null);
  const [githubStatus, setGithubStatus] = useState<GithubStatusDTO | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceDTO | null>(
    null
  );
  const [pushModalResource, setPushModalResource] =
    useState<ResourceDTO | null>(null);
  const [pullModalState, setPullModalState] = useState<{
    open: boolean;
    resource: ResourceDTO | null;
  }>({ open: false, resource: null });
  const [form, setForm] = useState<ResourceFormState>({
    title: "",
    description: "",
    type: "SLIDES",
    url: "",
    content: "",
    language: "",
    filename: "",
    runCommand: "",
    githubRepoUrl: "",
    githubBranch: "main",
    githubPath: "",
    pushToGithubOnSave: false,
    codeInputMode: "link",
    publishedAt: new Date().toISOString(),
  });
  const [folderFiles, setFolderFiles] = useState<ScannedFolderFile[]>([]);
  const [skippedFiles, setSkippedFiles] = useState<SkippedFolderFile[]>([]);
  const [scanningFolder, setScanningFolder] = useState(false);
  const [loadingExistingFiles, setLoadingExistingFiles] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const loadDay = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getAdminDay(id);
      setDay(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load day");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDay();
    api
      .getGithubStatus()
      .then(setGithubStatus)
      .catch(() => setGithubStatus(null));
  }, [loadDay]);

  const openCreateModal = (initialMode: "default" | "folder" = "default") => {
    setEditingResource(null);
    setFolderFiles([]);
    setSkippedFiles([]);
    setForm({
      title: "",
      description: "",
      type: initialMode === "folder" ? "CODE" : "SLIDES",
      url: "",
      content: "",
      language: "",
      filename: "",
      runCommand: "",
      githubRepoUrl: githubStatus?.defaultRepoUrl ?? "",
      githubBranch: githubStatus?.defaultBranch ?? "main",
      githubPath: "",
      pushToGithubOnSave: false,
      codeInputMode: initialMode === "folder" ? "folder" : "link",
      publishedAt: new Date().toISOString(),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = async (res: ResourceDTO) => {
    setEditingResource(res);
    setSkippedFiles([]);
    const hasFolder = res.type === "CODE" && (res.fileCount ?? 0) > 0;
    const hasPastedCode =
      res.type === "CODE" && !hasFolder && Boolean(res.content) && !res.url;
    setForm({
      title: res.title,
      description: res.description ?? "",
      type: res.type,
      url: res.url ?? "",
      content: res.content ?? "",
      language: res.language ?? "",
      filename: res.filename ?? "",
      runCommand: res.runCommand ?? "",
      githubRepoUrl: res.githubRepoUrl ?? githubStatus?.defaultRepoUrl ?? "",
      githubBranch: res.githubBranch ?? githubStatus?.defaultBranch ?? "main",
      githubPath: res.githubPath ?? "",
      pushToGithubOnSave: false,
      codeInputMode: hasFolder ? "folder" : hasPastedCode ? "paste" : "link",
      publishedAt: res.publishedAt,
    });
    setFolderFiles([]);
    setFormError(null);
    setModalOpen(true);

    if (hasFolder) {
      setLoadingExistingFiles(true);
      try {
        const existing = await api.getAdminResourceFiles(res.id);
        setFolderFiles(
          existing.map((f) => ({
            path: f.path,
            content: f.content,
            language: f.language,
            sizeBytes: f.sizeBytes,
            selected: true,
          }))
        );
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Failed to load folder files"
        );
      } finally {
        setLoadingExistingFiles(false);
      }
    }
  };

  const applyScannedFolder = (
    folderName: string,
    files: ScannedFolderFile[],
    skipped: SkippedFolderFile[],
    suggestedRunCommand: string | null
  ) => {
    setFolderFiles(files);
    setSkippedFiles(skipped);
    setForm((prev) => {
      const nextTitle = prev.title || folderName || "";
      const slug = slugifyFolderName(folderName || nextTitle || "code-folder");
      const defaultPath =
        day && slug
          ? `day-${String(day.dayNumber).padStart(2, "0")}/${slug}`
          : slug;
      return {
        ...prev,
        title: nextTitle,
        runCommand: prev.runCommand || suggestedRunCommand || "",
        githubPath: prev.githubPath || defaultPath,
      };
    });
  };

  const handleFolderSelect = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setScanningFolder(true);
    setFormError(null);
    try {
      const scanned = await scanFileListFolder(fileList);
      applyScannedFolder(
        scanned.folderName,
        scanned.files,
        scanned.skipped,
        scanned.suggestedRunCommand
      );
      if (scanned.files.length === 0) {
        setFormError(
          "No readable text/code files found in that folder (binaries, node_modules, .git, and .env files are ignored)."
        );
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to read selected folder"
      );
    } finally {
      setScanningFolder(false);
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  };

  const handleFolderDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    setScanningFolder(true);
    setFormError(null);
    try {
      const scanned = await scanDroppedFolder(e.dataTransfer);
      applyScannedFolder(
        scanned.folderName,
        scanned.files,
        scanned.skipped,
        scanned.suggestedRunCommand
      );
      if (scanned.files.length === 0) {
        setFormError(
          "No readable text/code files found in the dropped folder."
        );
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to read dropped folder"
      );
    } finally {
      setScanningFolder(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setFormError(null);
    try {
      const uploaded = await api.uploadFile(file);
      setForm((prev) => ({
        ...prev,
        url: uploaded.url,
        title: prev.title || uploaded.filename,
        filename:
          prev.type === "CODE" && !prev.filename
            ? uploaded.filename
            : prev.filename,
      }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!day) return;
    setFormError(null);

    const isPasteCode = form.type === "CODE" && form.codeInputMode === "paste";
    const isFolderCode =
      form.type === "CODE" && form.codeInputMode === "folder";

    const selectedFolderFiles = folderFiles
      .filter((f) => f.selected)
      .map((f) => ({
        path: f.path,
        content: f.content,
        language: f.language ?? null,
      }));

    if (isFolderCode && selectedFolderFiles.length === 0) {
      setFormError(
        "Please select a code folder with at least one checked file."
      );
      return;
    }

    setSaving(true);
    try {
      const payloadUrl = isPasteCode || isFolderCode ? null : form.url;
      const payloadContent =
        form.type === "CODE"
          ? isPasteCode
            ? form.content
            : null
          : undefined;
      const payloadLanguage =
        form.type === "CODE" && !isFolderCode ? form.language || null : null;
      const payloadFilename =
        form.type === "CODE" && !isFolderCode ? form.filename || null : null;

      let savedResource: ResourceDTO;
      if (editingResource) {
        savedResource = await api.updateResource(editingResource.id, {
          title: form.title,
          description: form.description || null,
          type: form.type,
          url: payloadUrl,
          ...(payloadContent !== undefined ? { content: payloadContent } : {}),
          language: payloadLanguage,
          filename: payloadFilename,
          runCommand: isFolderCode ? form.runCommand || null : null,
          githubRepoUrl: isFolderCode ? form.githubRepoUrl || null : null,
          githubBranch: isFolderCode ? form.githubBranch || null : null,
          githubPath: isFolderCode ? form.githubPath || null : null,
          ...(isFolderCode
            ? { files: selectedFolderFiles }
            : editingResource.fileCount
              ? { files: [] }
              : {}),
          publishedAt: form.publishedAt,
        });
      } else {
        const nextOrder =
          day.resources.length > 0
            ? Math.max(...day.resources.map((r) => r.order)) + 1
            : 1;
        savedResource = await api.createResource(day.id, {
          title: form.title,
          description: form.description || null,
          type: form.type,
          url: payloadUrl,
          content: payloadContent ?? null,
          language: payloadLanguage,
          filename: payloadFilename,
          runCommand: isFolderCode ? form.runCommand || null : null,
          githubRepoUrl: isFolderCode ? form.githubRepoUrl || null : null,
          githubBranch: isFolderCode ? form.githubBranch || null : null,
          githubPath: isFolderCode ? form.githubPath || null : null,
          ...(isFolderCode ? { files: selectedFolderFiles } : {}),
          order: nextOrder,
          publishedAt: form.publishedAt,
        });
      }

      if (
        isFolderCode &&
        form.pushToGithubOnSave &&
        form.githubRepoUrl.trim()
      ) {
        try {
          await api.pushResourceToGithub(savedResource.id, {
            repoUrl: form.githubRepoUrl.trim(),
            branch: form.githubBranch.trim() || undefined,
            targetPath: form.githubPath.trim(),
            commitMessage: `Day ${day.dayNumber}: ${form.title}`,
          });
        } catch (pushErr) {
          await loadDay();
          setEditingResource(savedResource);
          setFormError(
            `Folder saved, but GitHub push failed: ${
              pushErr instanceof Error ? pushErr.message : "Unknown error"
            }`
          );
          setSaving(false);
          return;
        }
      }

      setModalOpen(false);
      await loadDay();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save resource"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (res: ResourceDTO) => {
    try {
      const isLive = getPublishStatus(res.publishedAt) === "published";
      await api.updateResource(res.id, {
        publishedAt: isLive ? null : new Date().toISOString(),
      });
      await loadDay();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleDelete = async (res: ResourceDTO) => {
    if (!window.confirm(`Delete resource "${res.title}"?`)) return;
    try {
      await api.deleteResource(res.id);
      await loadDay();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete resource"
      );
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!day) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= day.resources.length) return;

    const current = day.resources[index];
    const target = day.resources[targetIndex];

    try {
      await Promise.all([
        api.updateResource(current.id, { order: target.order }),
        api.updateResource(target.id, { order: current.order }),
      ]);
      await loadDay();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reorder resources"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !day) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </Link>
        <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/50 p-6 text-red-300">
          {error || "Day not found"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-emerald-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to All Days
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-emerald-700/60 bg-emerald-900 px-2.5 py-0.5 text-xs font-semibold text-emerald-100">
              Day {day.dayNumber}
            </span>
            <PublishStatusBadge publishedAt={day.publishedAt} />
          </div>
          <h1 className="mt-2 text-2xl font-bold text-zinc-100">
            {day.title}
          </h1>
          {day.summary && (
            <p className="mt-1 text-sm text-zinc-400">{day.summary}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPullModalState({ open: true, resource: null })}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-700 hover:text-emerald-300"
          >
            <DownloadCloud className="h-4 w-4 text-emerald-400" />
            Pull from GitHub
          </button>
          <button
            type="button"
            onClick={() => openCreateModal("folder")}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/70 bg-emerald-950/70 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-900/70"
          >
            <FolderUp className="h-4 w-4" />
            Upload Code Folder
          </button>
          <button
            type="button"
            onClick={() => openCreateModal("default")}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Resource
          </button>
        </div>
      </div>

      {day.resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="font-medium text-zinc-100">No resources yet</p>
          <p className="mt-1 text-sm text-zinc-400">
            Add slides, videos, readings, code folders, or assignments for Day{" "}
            {day.dayNumber}.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
          <div className="divide-y divide-zinc-800">
            {day.resources.map((res, index) => {
              const hasFolder = (res.fileCount ?? 0) > 0;
              const canPushToGithub =
                res.type === "CODE" && (hasFolder || Boolean(res.content));
              const githubHref = res.githubRepoUrl
                ? res.githubPath
                  ? `${res.githubRepoUrl.replace(/\/+$/, "")}/tree/${encodeURIComponent(
                      res.githubBranch || "main"
                    )}/${res.githubPath
                      .split("/")
                      .map(encodeURIComponent)
                      .join("/")}`
                  : res.githubRepoUrl
                : null;

              return (
                <div
                  key={res.id}
                  className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ResourceBadge type={res.type} />
                      <span className="font-semibold text-zinc-100">
                        {res.title}
                      </span>
                      <PublishStatusBadge publishedAt={res.publishedAt} />
                    </div>
                    {res.description && (
                      <p className="mt-1 text-sm text-zinc-400">
                        {res.description}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      {hasFolder ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                          <FolderCode className="h-3.5 w-3.5" />
                          Code folder ({res.fileCount}{" "}
                          {res.fileCount === 1 ? "file" : "files"})
                          {res.runCommand && (
                            <span className="ml-1 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">
                              {res.runCommand}
                            </span>
                          )}
                        </span>
                      ) : res.url ? (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                        >
                          <span className="max-w-md truncate">{res.url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : res.content ? (
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                          <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                          Pasted code ({res.content.split("\n").length} lines)
                        </span>
                      ) : null}

                      {githubHref && (
                        <a
                          href={githubHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-700/80 bg-zinc-950 px-2 py-0.5 text-[11px] text-zinc-300 hover:border-emerald-700 hover:text-emerald-300"
                        >
                          <GitBranch className="h-3 w-3 text-emerald-400" />
                          <span>
                            {res.githubPath || "GitHub"}
                            {res.githubCommitSha
                              ? ` (${res.githubCommitSha.slice(0, 7)})`
                              : ""}
                          </span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {res.type === "CODE" && (
                      <button
                        type="button"
                        onClick={() =>
                          setPullModalState({ open: true, resource: res })
                        }
                        title="Pull & sync latest files from GitHub"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs font-medium text-zinc-200 hover:border-emerald-700 hover:text-emerald-300"
                      >
                        <DownloadCloud className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Pull</span>
                      </button>
                    )}
                    {canPushToGithub && (
                      <button
                        type="button"
                        onClick={() => setPushModalResource(res)}
                        title="Push to GitHub"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-800/70 bg-emerald-950/60 px-2.5 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-900/60"
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Push</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, "up")}
                      title="Move up"
                      className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === day.resources.length - 1}
                      onClick={() => handleMove(index, "down")}
                      title="Move down"
                      className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(res)}
                      title={
                        getPublishStatus(res.publishedAt) === "published"
                          ? "Move to Draft"
                          : "Publish Now"
                      }
                      className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 hover:bg-zinc-800"
                    >
                      {getPublishStatus(res.publishedAt) === "published" ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(res)}
                      title="Edit resource"
                      className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 hover:bg-zinc-800"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(res)}
                      title="Delete resource"
                      className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-red-400 hover:bg-red-950/50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Resource Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div
            className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl ${
              form.type === "CODE" && form.codeInputMode === "folder"
                ? "max-w-2xl"
                : "max-w-lg"
            }`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-lg font-bold text-zinc-100">
                {editingResource ? "Edit Resource" : "Add Resource"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                {formError && (
                  <div className="rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-300">
                    {formError}
                  </div>
                )}
              <div>
                <label className="block text-sm font-medium text-zinc-300">
                  Resource Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as ResourceType })
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                >
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {RESOURCE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Lecture 3 Slides"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {form.type === "CODE" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300">
                      Code Source
                    </label>
                    <div className="mt-1 grid grid-cols-3 gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, codeInputMode: "link" })
                        }
                        className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                          form.codeInputMode === "link"
                            ? "bg-emerald-800 text-emerald-50"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        URL / File
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, codeInputMode: "paste" })
                        }
                        className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                          form.codeInputMode === "paste"
                            ? "bg-emerald-800 text-emerald-50"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        Paste Code
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, codeInputMode: "folder" })
                        }
                        className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                          form.codeInputMode === "folder"
                            ? "bg-emerald-800 text-emerald-50"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <FolderUp className="h-3.5 w-3.5" />
                        Code Folder
                      </button>
                    </div>
                  </div>

                  {form.codeInputMode !== "folder" && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300">
                          Language (optional)
                        </label>
                        <select
                          value={form.language}
                          onChange={(e) =>
                            setForm({ ...form, language: e.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                        >
                          <option value="">Auto-detect</option>
                          {CODE_LANGUAGES.map((lang) => (
                            <option key={lang} value={lang}>
                              {CODE_LANGUAGE_LABELS[lang]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300">
                          Filename (optional)
                        </label>
                        <input
                          type="text"
                          value={form.filename}
                          onChange={(e) =>
                            setForm({ ...form, filename: e.target.value })
                          }
                          placeholder="e.g., server.ts"
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {form.type === "CODE" && form.codeInputMode === "folder" ? (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleFolderDrop}
                    className={`rounded-xl border-2 border-dashed p-5 text-center transition ${
                      dragActive
                        ? "border-emerald-500 bg-emerald-950/30"
                        : "border-zinc-700 bg-zinc-950/60 hover:border-zinc-600"
                    }`}
                  >
                    <FolderUp className="mx-auto h-7 w-7 text-emerald-400" />
                    <p className="mt-2 text-sm font-medium text-zinc-200">
                      {scanningFolder
                        ? "Scanning folder..."
                        : "Drop a code folder here or choose one from your computer"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Automatically skips <code>node_modules</code>,{" "}
                      <code>.git</code>, <code>dist</code>, <code>.env</code>,
                      and binary files.
                    </p>
                    <div className="mt-3">
                      <button
                        type="button"
                        disabled={scanningFolder}
                        onClick={() => folderInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/70 bg-emerald-950/70 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/70 disabled:opacity-50"
                      >
                        <FolderCode className="h-3.5 w-3.5" />
                        {folderFiles.length > 0
                          ? "Replace Folder"
                          : "Choose Folder"}
                      </button>
                      <input
                        ref={folderInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        // @ts-expect-error webkitdirectory is a non-standard attribute supported across modern browsers
                        webkitdirectory=""
                        directory=""
                        onChange={(e) => handleFolderSelect(e.target.files)}
                      />
                    </div>
                  </div>

                  {loadingExistingFiles ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center text-xs text-zinc-400">
                      Loading existing folder files...
                    </div>
                  ) : folderFiles.length > 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950">
                      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 text-xs">
                        <span className="font-medium text-zinc-200">
                          {folderFiles.filter((f) => f.selected).length} /{" "}
                          {folderFiles.length} files selected (
                          {formatBytes(
                            folderFiles
                              .filter((f) => f.selected)
                              .reduce((sum, f) => sum + f.sizeBytes, 0)
                          )}
                          )
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFolderFiles((prev) =>
                                prev.map((f) => ({ ...f, selected: true }))
                              )
                            }
                            className="text-emerald-400 hover:underline"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFolderFiles((prev) =>
                                prev.map((f) => ({ ...f, selected: false }))
                              )
                            }
                            className="text-zinc-400 hover:underline"
                          >
                            None
                          </button>
                        </div>
                      </div>
                      <div className="max-h-44 divide-y divide-zinc-900 overflow-y-auto px-2 py-1">
                        {folderFiles.map((file, idx) => (
                          <label
                            key={file.path}
                            className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-zinc-900"
                          >
                            <input
                              type="checkbox"
                              checked={file.selected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFolderFiles((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? { ...item, selected: checked }
                                      : item
                                  )
                                );
                              }}
                              className="rounded border-zinc-600 bg-zinc-900 text-emerald-600"
                            />
                            <span className="min-w-0 flex-1 truncate font-mono text-zinc-200">
                              {file.path}
                            </span>
                            <span className="shrink-0 text-[11px] text-zinc-500">
                              {formatBytes(file.sizeBytes)}
                            </span>
                          </label>
                        ))}
                      </div>
                      {skippedFiles.length > 0 && (
                        <details className="border-t border-zinc-800 px-3 py-2 text-[11px] text-zinc-500">
                          <summary className="cursor-pointer hover:text-zinc-300">
                            {skippedFiles.length} ignored{" "}
                            {skippedFiles.length === 1 ? "file" : "files"}
                          </summary>
                          <ul className="mt-1.5 max-h-24 space-y-0.5 overflow-y-auto font-mono">
                            {skippedFiles.slice(0, 50).map((s) => (
                              <li
                                key={`${s.path}-${s.reason}`}
                                className="truncate"
                              >
                                {s.path} — {s.reason}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  ) : null}

                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
                      <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                      In-Browser Run Command (optional)
                    </label>
                    <input
                      type="text"
                      value={form.runCommand}
                      onChange={(e) =>
                        setForm({ ...form, runCommand: e.target.value })
                      }
                      placeholder='e.g., npm run dev, node index.js, or "static" for HTML/CSS'
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                        <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
                        GitHub Integration (optional)
                      </span>
                      {githubStatus && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            githubStatus.configured
                              ? "bg-emerald-950/70 text-emerald-300"
                              : "bg-amber-950/60 text-amber-300"
                          }`}
                        >
                          {githubStatus.configured
                            ? "Token configured"
                            : "Set GITHUB_TOKEN in .env"}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400">
                        Public GitHub Repository URL
                      </label>
                      <input
                        type="text"
                        value={form.githubRepoUrl}
                        onChange={(e) =>
                          setForm({ ...form, githubRepoUrl: e.target.value })
                        }
                        placeholder="https://github.com/owner/repo"
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400">
                          Branch
                        </label>
                        <input
                          type="text"
                          value={form.githubBranch}
                          onChange={(e) =>
                            setForm({ ...form, githubBranch: e.target.value })
                          }
                          placeholder="main"
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400">
                          Folder Path in Repo
                        </label>
                        <input
                          type="text"
                          value={form.githubPath}
                          onChange={(e) =>
                            setForm({ ...form, githubPath: e.target.value })
                          }
                          placeholder={`day-${String(day.dayNumber).padStart(2, "0")}/my-demo (or blank for root)`}
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={form.pushToGithubOnSave}
                        disabled={!form.githubRepoUrl.trim()}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pushToGithubOnSave: e.target.checked,
                          })
                        }
                        className="rounded border-zinc-600 bg-zinc-900 text-emerald-600 disabled:opacity-40"
                      />
                      Push this folder to GitHub immediately on save
                    </label>
                  </div>
                </div>
              ) : form.type === "CODE" && form.codeInputMode === "paste" ? (
                <div>
                  <label className="block text-sm font-medium text-zinc-300">
                    Code
                  </label>
                  <textarea
                    required
                    rows={8}
                    value={form.content}
                    onChange={(e) =>
                      setForm({ ...form, content: e.target.value })
                    }
                    placeholder="Paste your code snippet here..."
                    spellCheck={false}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-zinc-300">
                    URL or Uploaded File
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      required
                      value={form.url}
                      onChange={(e) =>
                        setForm({ ...form, url: e.target.value })
                      }
                      placeholder="https://... or upload a file"
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                    />
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700">
                      <Upload className="h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload"}
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Short note about this material..."
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <PublishControl
                value={form.publishedAt}
                onChange={(nextIso) =>
                  setForm({ ...form, publishedAt: nextIso })
                }
              />

              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-800 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading || scanningFolder}
                  className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving
                    ? form.pushToGithubOnSave
                      ? "Saving & Pushing..."
                      : "Saving..."
                    : editingResource
                      ? "Save Changes"
                      : "Add Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pushModalResource && (
        <PushToGithubModal
          resource={pushModalResource}
          dayNumber={day.dayNumber}
          githubStatus={githubStatus}
          onClose={() => setPushModalResource(null)}
          onPushed={() => {
            void loadDay();
          }}
        />
      )}

      {pullModalState.open && (
        <PullFromGithubModal
          resource={pullModalState.resource}
          dayId={day.id}
          dayNumber={day.dayNumber}
          githubStatus={githubStatus}
          onClose={() => setPullModalState({ open: false, resource: null })}
          onPulled={() => {
            void loadDay();
          }}
        />
      )}
    </div>
  );
}
