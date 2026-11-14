import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Eye,
  EyeOff,
  FolderCog,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { DayWithResourcesDTO } from "@repo/shared";
import { api } from "../lib/api";

interface DayFormState {
  dayNumber: number;
  title: string;
  date: string;
  summary: string;
  isPublished: boolean;
}

export function AdminDashboardPage() {
  const [days, setDays] = useState<DayWithResourcesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<DayWithResourcesDTO | null>(
    null
  );
  const [form, setForm] = useState<DayFormState>({
    dayNumber: 1,
    title: "",
    date: "",
    summary: "",
    isPublished: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadDays = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminDays();
      setDays(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load days");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDays();
  }, []);

  const openCreateModal = () => {
    const nextNum =
      days.length > 0 ? Math.max(...days.map((d) => d.dayNumber)) + 1 : 1;
    setEditingDay(null);
    setForm({
      dayNumber: nextNum,
      title: "",
      date: "",
      summary: "",
      isPublished: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (day: DayWithResourcesDTO) => {
    setEditingDay(day);
    setForm({
      dayNumber: day.dayNumber,
      title: day.title,
      date: day.date ? day.date.slice(0, 10) : "",
      summary: day.summary ?? "",
      isPublished: day.isPublished,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        dayNumber: Number(form.dayNumber),
        title: form.title,
        date: form.date ? new Date(form.date).toISOString() : null,
        summary: form.summary || null,
        isPublished: form.isPublished,
      };

      if (editingDay) {
        await api.updateDay(editingDay.id, payload);
      } else {
        await api.createDay(payload);
      }
      setModalOpen(false);
      await loadDays();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save day");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (day: DayWithResourcesDTO) => {
    try {
      await api.updateDay(day.id, { isPublished: !day.isPublished });
      await loadDays();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleDelete = async (day: DayWithResourcesDTO) => {
    if (
      !window.confirm(
        `Delete Day ${day.dayNumber}: "${day.title}" and all its resources?`
      )
    ) {
      return;
    }
    try {
      await api.deleteDay(day.id);
      await loadDays();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete day");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Admin: Class Days
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and organize class days, then add resources to each day.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add Day
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="font-medium text-slate-900">No days created yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Click &ldquo;Add Day&rdquo; to create your first class session.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="divide-y divide-slate-100">
            {days.map((day) => (
              <div
                key={day.id}
                className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center rounded-md bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                      Day {day.dayNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        day.isPublished
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {day.isPublished ? "Published" : "Draft"}
                    </span>
                    {day.date && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {day.resources.length}{" "}
                      {day.resources.length === 1 ? "resource" : "resources"}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-lg font-semibold text-slate-900">
                    {day.title}
                  </h2>
                  {day.summary && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {day.summary}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    to={`/admin/days/${day.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    <FolderCog className="h-4 w-4" />
                    Manage Resources
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleTogglePublish(day)}
                    title={day.isPublished ? "Unpublish" : "Publish"}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                  >
                    {day.isPublished ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(day)}
                    title="Edit day"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(day)}
                    title="Delete day"
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingDay ? `Edit Day ${editingDay.dayNumber}` : "Add New Day"}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Day Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.dayNumber}
                    onChange={(e) =>
                      setForm({ ...form, dayNumber: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Date (optional)
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
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
                  placeholder="e.g., Introduction to React Router"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Summary (optional)
                </label>
                <textarea
                  rows={3}
                  value={form.summary}
                  onChange={(e) =>
                    setForm({ ...form, summary: e.target.value })
                  }
                  placeholder="Brief overview of topics covered today..."
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
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingDay ? "Save Changes" : "Create Day"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
