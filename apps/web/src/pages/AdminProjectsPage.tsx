import { useEffect, useState, type FormEvent } from "react";
import {
  Clock,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Rocket,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  getPublishStatus,
  PROJECT_DIFFICULTIES,
  PROJECT_DIFFICULTY_LABELS,
  type DayWithResourcesDTO,
  type MiniProjectDTO,
  type MiniProjectMilestone,
  type ProjectDifficulty,
} from "@repo/shared";
import { api } from "../lib/api";
import {
  PublishControl,
  PublishStatusBadge,
} from "../components/PublishControl";

interface ProjectFormState {
  title: string;
  summary: string;
  instructions: string;
  milestones: MiniProjectMilestone[];
  starterRepoUrl: string;
  demoUrl: string;
  specUrl: string;
  solutionUrl: string;
  attachmentUrl: string;
  dayId: string;
  difficulty: ProjectDifficulty;
  estimatedMinutes: string;
  tagsText: string;
  dueDate: string;
  order: number;
  publishedAt: string | null;
}

const emptyForm = (nextOrder: number): ProjectFormState => ({
  title: "",
  summary: "",
  instructions: "",
  milestones: [],
  starterRepoUrl: "",
  demoUrl: "",
  specUrl: "",
  solutionUrl: "",
  attachmentUrl: "",
  dayId: "",
  difficulty: "INTERMEDIATE",
  estimatedMinutes: "",
  tagsText: "",
  dueDate: "",
  order: nextOrder,
  publishedAt: new Date().toISOString(),
});

export function AdminProjectsPage() {
  const [projects, setProjects] = useState<MiniProjectDTO[]>([]);
  const [days, setDays] = useState<DayWithResourcesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MiniProjectDTO | null>(null);
  const [form, setForm] = useState<ProjectFormState>(() => emptyForm(1));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projData, daysData] = await Promise.all([
        api.getAdminMiniProjects(),
        api.getAdminDays(),
      ]);
      setProjects(projData);
      setDays(daysData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load mini projects"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    const nextOrder =
      projects.length > 0 ? Math.max(...projects.map((p) => p.order)) + 1 : 1;
    setEditing(null);
    setForm(emptyForm(nextOrder));
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (project: MiniProjectDTO) => {
    setEditing(project);
    setForm({
      title: project.title,
      summary: project.summary ?? "",
      instructions: project.instructions ?? "",
      milestones: project.milestones.map((m) => ({ ...m })),
      starterRepoUrl: project.starterRepoUrl ?? "",
      demoUrl: project.demoUrl ?? "",
      specUrl: project.specUrl ?? "",
      solutionUrl: project.solutionUrl ?? "",
      attachmentUrl: project.attachmentUrl ?? "",
      dayId: project.dayId ?? "",
      difficulty: project.difficulty,
      estimatedMinutes: project.estimatedMinutes
        ? String(project.estimatedMinutes)
        : "",
      tagsText: project.tags.join(", "),
      dueDate: project.dueDate ? project.dueDate.slice(0, 10) : "",
      order: project.order,
      publishedAt: project.publishedAt,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setFormError(null);
    try {
      const uploaded = await api.uploadFile(file);
      setForm((prev) => ({ ...prev, attachmentUrl: uploaded.url }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const addMilestone = () => {
    setForm((prev) => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        {
          id: `m-${Date.now()}-${prev.milestones.length + 1}`,
          title: "",
          description: "",
        },
      ],
    }));
  };

  const updateMilestone = (
    idx: number,
    patch: Partial<MiniProjectMilestone>
  ) => {
    setForm((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === idx ? { ...m, ...patch } : m
      ),
    }));
  };

  const removeMilestone = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const tags = form.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const milestones = form.milestones
        .filter((m) => m.title.trim().length > 0)
        .map((m) => ({
          id: m.id,
          title: m.title.trim(),
          description: m.description?.trim() || null,
        }));

      const payload = {
        title: form.title,
        summary: form.summary || null,
        instructions: form.instructions || null,
        milestones,
        starterRepoUrl: form.starterRepoUrl || null,
        demoUrl: form.demoUrl || null,
        specUrl: form.specUrl || null,
        solutionUrl: form.solutionUrl || null,
        attachmentUrl: form.attachmentUrl || null,
        dayId: form.dayId || null,
        difficulty: form.difficulty,
        estimatedMinutes: form.estimatedMinutes
          ? Number(form.estimatedMinutes)
          : null,
        tags,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        order: Number(form.order) || 0,
        publishedAt: form.publishedAt,
      };

      if (editing) {
        await api.updateMiniProject(editing.id, payload);
      } else {
        await api.createMiniProject(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save mini project"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (project: MiniProjectDTO) => {
    try {
      const isLive = getPublishStatus(project.publishedAt) === "published";
      await api.updateMiniProject(project.id, {
        publishedAt: isLive ? null : new Date().toISOString(),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleDelete = async (project: MiniProjectDTO) => {
    if (!window.confirm(`Delete mini project "${project.title}"?`)) return;
    try {
      await api.deleteMiniProject(project.id);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete mini project"
      );
    }
  };

  return (
    <div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Admin: Mini Projects
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Create standalone hands-on projects with starter links, markdown
            briefs, milestones, and scheduled publishing.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Add Mini Project
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-900/60 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <Rocket className="mx-auto h-10 w-10 text-zinc-500" />
          <p className="mt-3 font-medium text-zinc-100">
            No mini projects created yet
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Click &ldquo;Add Mini Project&rdquo; to create your first project.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
          <div className="divide-y divide-zinc-800">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-200">
                      {PROJECT_DIFFICULTY_LABELS[project.difficulty]}
                    </span>
                    <PublishStatusBadge publishedAt={project.publishedAt} />
                    {project.day && (
                      <span className="rounded-md border border-emerald-800/60 bg-emerald-950/70 px-2 py-0.5 text-xs font-medium text-emerald-300">
                        Day {project.day.dayNumber}
                      </span>
                    )}
                    {project.estimatedMinutes && (
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                        <Clock className="h-3.5 w-3.5" />~
                        {project.estimatedMinutes}m
                      </span>
                    )}
                    <span className="text-xs text-zinc-500">
                      {project.milestones.length}{" "}
                      {project.milestones.length === 1
                        ? "milestone"
                        : "milestones"}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-lg font-semibold text-zinc-100">
                    {project.title}
                  </h2>
                  {project.summary && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                      {project.summary}
                    </p>
                  )}
                  {project.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {project.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(project)}
                    title={
                      getPublishStatus(project.publishedAt) === "published"
                        ? "Move to Draft"
                        : "Publish Now"
                    }
                    className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 hover:bg-zinc-800"
                  >
                    {getPublishStatus(project.publishedAt) === "published" ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(project)}
                    title="Edit mini project"
                    className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 hover:bg-zinc-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(project)}
                    title="Delete mini project"
                    className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-red-400 hover:bg-red-950/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-lg font-bold text-zinc-100">
                {editing ? "Edit Mini Project" : "Add Mini Project"}
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
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
                {formError && (
                  <div className="rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-300">
                    {formError}
                  </div>
                )}
              {/* Core & Metadata */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                  Metadata
                </h3>
                <div>
                  <label className="block text-sm font-medium text-zinc-300">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    placeholder="e.g., CLI Task Tracker in TypeScript"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300">
                      Difficulty
                    </label>
                    <select
                      value={form.difficulty}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          difficulty: e.target.value as ProjectDifficulty,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                    >
                      {PROJECT_DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>
                          {PROJECT_DIFFICULTY_LABELS[d]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300">
                      Linked Day (optional)
                    </label>
                    <select
                      value={form.dayId}
                      onChange={(e) =>
                        setForm({ ...form, dayId: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                    >
                      <option value="">None</option>
                      {days.map((d) => (
                        <option key={d.id} value={d.id}>
                          Day {d.dayNumber}: {d.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300">
                      Est. Minutes
                    </label>
                    <input
                      type="number"
                      min={5}
                      value={form.estimatedMinutes}
                      onChange={(e) =>
                        setForm({ ...form, estimatedMinutes: e.target.value })
                      }
                      placeholder="60"
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-zinc-300">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={form.tagsText}
                      onChange={(e) =>
                        setForm({ ...form, tagsText: e.target.value })
                      }
                      placeholder="TypeScript, React, REST"
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) =>
                        setForm({ ...form, dueDate: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Links & Artifacts */}
              <div className="space-y-3 border-t border-zinc-800 pt-4">
                <h3 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                  Links & Artifacts
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">
                      Starter Repo URL
                    </label>
                    <input
                      type="text"
                      value={form.starterRepoUrl}
                      onChange={(e) =>
                        setForm({ ...form, starterRepoUrl: e.target.value })
                      }
                      placeholder="https://github.com/..."
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">
                      Live Demo URL
                    </label>
                    <input
                      type="text"
                      value={form.demoUrl}
                      onChange={(e) =>
                        setForm({ ...form, demoUrl: e.target.value })
                      }
                      placeholder="https://..."
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">
                      Spec / Rubric URL
                    </label>
                    <input
                      type="text"
                      value={form.specUrl}
                      onChange={(e) =>
                        setForm({ ...form, specUrl: e.target.value })
                      }
                      placeholder="https://..."
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">
                      Reference Solution URL
                    </label>
                    <input
                      type="text"
                      value={form.solutionUrl}
                      onChange={(e) =>
                        setForm({ ...form, solutionUrl: e.target.value })
                      }
                      placeholder="https://github.com/..."
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300">
                    Starter Files / Attachment URL
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={form.attachmentUrl}
                      onChange={(e) =>
                        setForm({ ...form, attachmentUrl: e.target.value })
                      }
                      placeholder="/uploads/... or upload a starter ZIP"
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                    />
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700">
                      <Upload className="h-3.5 w-3.5" />
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
              </div>

              {/* Rich Content */}
              <div className="space-y-3 border-t border-zinc-800 pt-4">
                <h3 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                  Rich Content
                </h3>
                <div>
                  <label className="block text-sm font-medium text-zinc-300">
                    Summary
                  </label>
                  <textarea
                    rows={2}
                    value={form.summary}
                    onChange={(e) =>
                      setForm({ ...form, summary: e.target.value })
                    }
                    placeholder="Short card description..."
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300">
                    Instructions (Markdown)
                  </label>
                  <textarea
                    rows={5}
                    value={form.instructions}
                    onChange={(e) =>
                      setForm({ ...form, instructions: e.target.value })
                    }
                    placeholder="## Objective&#10;Describe the project goals, requirements, and tips..."
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-300">
                      Milestones ({form.milestones.length})
                    </label>
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Milestone
                    </button>
                  </div>
                  {form.milestones.length > 0 && (
                    <div className="space-y-2">
                      {form.milestones.map((m, idx) => (
                        <div
                          key={m.id}
                          className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-2.5"
                        >
                          <div className="flex-1 space-y-1.5">
                            <input
                              type="text"
                              value={m.title}
                              onChange={(e) =>
                                updateMilestone(idx, { title: e.target.value })
                              }
                              placeholder={`Milestone ${idx + 1} title`}
                              className="w-full rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                            />
                            <input
                              type="text"
                              value={m.description ?? ""}
                              onChange={(e) =>
                                updateMilestone(idx, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Optional details..."
                              className="w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 focus:border-emerald-600 focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMilestone(idx)}
                            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                  disabled={saving || uploading}
                  className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Save Changes"
                      : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
