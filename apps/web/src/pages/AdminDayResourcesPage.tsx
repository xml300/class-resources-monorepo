import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  type DayWithResourcesDTO,
  type ResourceDTO,
  type ResourceType,
} from "@repo/shared";
import { api } from "../lib/api";
import { ResourceBadge } from "../components/ResourceBadge";

interface ResourceFormState {
  title: string;
  description: string;
  type: ResourceType;
  url: string;
  isPublished: boolean;
}

export function AdminDayResourcesPage() {
  const { id } = useParams<{ id: string }>();
  const [day, setDay] = useState<DayWithResourcesDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceDTO | null>(
    null
  );
  const [form, setForm] = useState<ResourceFormState>({
    title: "",
    description: "",
    type: "SLIDES",
    url: "",
    isPublished: true,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
  }, [loadDay]);

  const openCreateModal = () => {
    setEditingResource(null);
    setForm({
      title: "",
      description: "",
      type: "SLIDES",
      url: "",
      isPublished: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (res: ResourceDTO) => {
    setEditingResource(res);
    setForm({
      title: res.title,
      description: res.description ?? "",
      type: res.type,
      url: res.url,
      isPublished: res.isPublished,
    });
    setFormError(null);
    setModalOpen(true);
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
    setSaving(true);
    try {
      if (editingResource) {
        await api.updateResource(editingResource.id, {
          title: form.title,
          description: form.description || null,
          type: form.type,
          url: form.url,
          isPublished: form.isPublished,
        });
      } else {
        const nextOrder =
          day.resources.length > 0
            ? Math.max(...day.resources.map((r) => r.order)) + 1
            : 1;
        await api.createResource(day.id, {
          title: form.title,
          description: form.description || null,
          type: form.type,
          url: form.url,
          order: nextOrder,
          isPublished: form.isPublished,
        });
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
      await api.updateResource(res.id, { isPublished: !res.isPublished });
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !day) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </Link>
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error || "Day not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to All Days
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
              Day {day.dayNumber}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                day.isPublished
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {day.isPublished ? "Published" : "Draft"}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {day.title}
          </h1>
          {day.summary && (
            <p className="mt-1 text-sm text-slate-500">{day.summary}</p>
          )}
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add Resource
        </button>
      </div>

      {day.resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="font-medium text-slate-900">No resources yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Add slides, videos, readings, code links, or assignments for Day{" "}
            {day.dayNumber}.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="divide-y divide-slate-100">
            {day.resources.map((res, index) => (
              <div
                key={res.id}
                className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ResourceBadge type={res.type} />
                    <span className="font-semibold text-slate-900">
                      {res.title}
                    </span>
                    {!res.isPublished && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Hidden
                      </span>
                    )}
                  </div>
                  {res.description && (
                    <p className="mt-1 text-sm text-slate-500">
                      {res.description}
                    </p>
                  )}
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                  >
                    <span className="max-w-md truncate">{res.url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMove(index, "up")}
                    title="Move up"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === day.resources.length - 1}
                    onClick={() => handleMove(index, "down")}
                    title="Move down"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(res)}
                    title={res.isPublished ? "Hide" : "Publish"}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                  >
                    {res.isPublished ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(res)}
                    title="Edit resource"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(res)}
                    title="Delete resource"
                    className="rounded-lg border border-slate-200 p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Resource Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingResource ? "Edit Resource" : "Add Resource"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Resource Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as ResourceType })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {RESOURCE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Lecture 3 Slides"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  URL or Uploaded File
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    required
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://... or upload a file"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
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

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Short note about this material..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) =>
                    setForm({ ...form, isPublished: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                Published (visible to students)
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingResource
                      ? "Save Changes"
                      : "Add Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
