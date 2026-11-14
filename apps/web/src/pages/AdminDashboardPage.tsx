import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Eye,
  EyeOff,
  FolderCog,
  Lock,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { getPublishStatus, type DayWithResourcesDTO } from "@repo/shared";
import { api } from "../lib/api";
import {
  PublishControl,
  PublishStatusBadge,
} from "../components/PublishControl";
import { AdminNavToggle } from "../components/AdminNavToggle";

interface DayFormState {
  dayNumber: number;
  title: string;
  date: string;
  summary: string;
  publishedAt: string | null;
  password: string;
  clearPassword: boolean;
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
    publishedAt: new Date().toISOString(),
    password: "",
    clearPassword: false,
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
      publishedAt: new Date().toISOString(),
      password: "",
      clearPassword: false,
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
      publishedAt: day.publishedAt,
      password: "",
      clearPassword: false,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        date: form.date ? new Date(form.date).toISOString() : null,
        summary: form.summary || null,
        publishedAt: form.publishedAt,
      };
      if (!editingDay) {
        payload.dayNumber = Number(form.dayNumber);
      }
      if (form.clearPassword) {
        payload.password = null;
      } else if (form.password.trim().length > 0) {
        payload.password = form.password.trim();
      }

      if (editingDay) {
        await api.updateDay(editingDay.id, payload);
      } else {
        await api.createDay(payload as Parameters<typeof api.createDay>[0]);
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
      const isLive = getPublishStatus(day.publishedAt) === "published";
      await api.updateDay(day.id, {
        publishedAt: isLive ? null : new Date().toISOString(),
      });
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
      <div className="mb-5">
        <AdminNavToggle />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Admin: Class Days
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Create and organize class days, then add resources to each day.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Add Day
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
      ) : days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="font-medium text-zinc-100">No days created yet</p>
          <p className="mt-1 text-sm text-zinc-400">
            Click &ldquo;Add Day&rdquo; to create your first class session.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
          <div className="divide-y divide-zinc-800">
            {days.map((day) => (
              <div
                key={day.id}
                className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center rounded-md border border-emerald-700/60 bg-emerald-900 px-2.5 py-0.5 text-xs font-semibold text-emerald-100">
                      Day {day.dayNumber}
                    </span>
                    <PublishStatusBadge publishedAt={day.publishedAt} />
                    {day.hasPassword && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-800/70 bg-amber-950/70 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                        <Lock className="h-3 w-3" />
                        Protected
                      </span>
                    )}
                    {day.date && (
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-xs text-zinc-500">
                      {day.resources.length}{" "}
                      {day.resources.length === 1 ? "resource" : "resources"}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-lg font-semibold text-zinc-100">
                    {day.title}
                  </h2>
                  {day.summary && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                      {day.summary}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    to={`/admin/days/${day.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-800/70 bg-emerald-950/70 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-900/70"
                  >
                    <FolderCog className="h-4 w-4" />
                    Manage Resources
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleTogglePublish(day)}
                    title={
                      getPublishStatus(day.publishedAt) === "published"
                        ? "Move to Draft"
                        : "Publish Now"
                    }
                    className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 hover:bg-zinc-800"
                  >
                    {getPublishStatus(day.publishedAt) === "published" ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(day)}
                    title="Edit day"
                    className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 hover:bg-zinc-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(day)}
                    title="Delete day"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100">
                {editingDay ? `Edit Day ${editingDay.dayNumber}` : "Add New Day"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300">
                  Date (optional)
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
                />
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
                  placeholder="e.g., Introduction to React Router"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">
                  Summary (optional)
                </label>
                <textarea
                  rows={3}
                  value={form.summary}
                  onChange={(e) =>
                    setForm({ ...form, summary: e.target.value })
                  }
                  placeholder="Brief overview of topics covered today..."
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <PublishControl
                value={form.publishedAt}
                onChange={(nextIso) =>
                  setForm({ ...form, publishedAt: nextIso })
                }
              />

              <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <label className="block text-xs font-medium text-zinc-300">
                  Access Password (optional)
                </label>
                <input
                  type="password"
                  disabled={form.clearPassword}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder={
                    editingDay?.hasPassword
                      ? "Leave blank to keep existing password"
                      : "Set a password to lock this day..."
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none disabled:opacity-50"
                />
                {editingDay?.hasPassword && (
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={form.clearPassword}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          clearPassword: e.target.checked,
                          password: e.target.checked ? "" : form.password,
                        })
                      }
                      className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-emerald-600"
                    />
                    Remove password protection
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-700 disabled:opacity-50"
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
