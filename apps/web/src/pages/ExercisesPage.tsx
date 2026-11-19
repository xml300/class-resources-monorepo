import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Search,
} from "lucide-react";
import type { ResourceWithDayDTO } from "@repo/shared";
import { api } from "../lib/api";
import { useDays } from "../context/DaysContext";
import { DayLockedCard } from "../components/DayLockedCard";
import { extractExerciseHeadings } from "../components/MarkdownContent";
import { StudentSidebar, useStudentSidebar } from "../layouts/StudentLayout";

function getCompletedExerciseCount(resourceId: string): number {
  try {
    const raw = localStorage.getItem(`exercise-progress:${resourceId}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function ExercisesPage() {
  const { closeSidebar } = useStudentSidebar();
  const { activeDay, loading: daysLoading, refreshDays } = useDays();
  const [exercises, setExercises] = useState<ResourceWithDayDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadExercises = useCallback(async () => {
    if (!activeDay || activeDay.isLocked) {
      setExercises([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPublicExercises({ dayId: activeDay.id });
      setExercises(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load coding exercises"
      );
    } finally {
      setLoading(false);
    }
  }, [activeDay]);

  useEffect(() => {
    if (daysLoading) return;
    void loadExercises();
  }, [daysLoading, loadExercises]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (!q) return true;
      return (
        ex.title.toLowerCase().includes(q) ||
        (ex.description ?? "").toLowerCase().includes(q) ||
        ex.day.title.toLowerCase().includes(q)
      );
    });
  }, [exercises, search]);

  if (daysLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">
        <p className="font-medium">Unable to load coding exercises</p>
        <p className="mt-1 text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StudentSidebar
        icon={<ClipboardList className="h-4 w-4 text-emerald-400" />}
        title={
          activeDay ? `Day ${activeDay.dayNumber} Challenges` : "Coding Challenges"
        }
        badge={
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
            {filtered.length}
          </span>
        }
      >
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-500">
            {activeDay?.isLocked
              ? `Unlock Day ${activeDay.dayNumber} to view challenges.`
              : "No challenges for this day."}
          </p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((ex, idx) => (
              <li key={ex.id}>
                <Link
                  to={`/exercises/${ex.id}`}
                  onClick={closeSidebar}
                  className="group flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800/80 hover:text-emerald-300"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-[11px] font-medium text-zinc-400 group-hover:bg-emerald-900/80 group-hover:text-emerald-200">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-200 group-hover:text-emerald-300">
                      {ex.title}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Day {ex.day.dayNumber}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </StudentSidebar>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-teal-950/40 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-700/50 bg-teal-950/80 px-3 py-1 text-xs font-medium text-teal-300">
              <ClipboardList className="h-3.5 w-3.5" />
              {activeDay
                ? `Day ${activeDay.dayNumber} • Interactive Node.js Challenges`
                : "Interactive Node.js Challenges"}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
              {activeDay
                ? `Day ${activeDay.dayNumber} Coding Challenges`
                : "Coding Challenges"}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-400">
              {activeDay
                ? `${activeDay.title} — solve each exercise right in the browser with full Node.js execution and automated tests.`
                : "Daily coding challenges with in-browser Node.js execution and per-exercise progress tracking."}
            </p>
          </div>
          {!activeDay?.isLocked && (
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <span className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 font-medium text-zinc-200">
                {exercises.length}{" "}
                {exercises.length === 1 ? "Set" : "Sets"} Available
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Locked Day Gate */}
      {activeDay?.isLocked ? (
        <DayLockedCard
          day={activeDay}
          sectionLabel="coding challenges"
          onUnlocked={async () => {
            await refreshDays();
          }}
        />
      ) : (
        <>
          {/* Search */}
          {exercises.length > 0 && (
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search challenges or topics..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pr-3 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          )}

          {/* Grid */}
          {exercises.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-12 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-zinc-500" />
              <h2 className="mt-3 text-base font-semibold text-zinc-100">
                {activeDay
                  ? `No coding challenges for Day ${activeDay.dayNumber} yet`
                  : "No coding challenges published yet"}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Switch days in the top navigation bar or check back soon.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-10 text-center text-sm text-zinc-400">
              No coding challenges match your search.
            </div>
          ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((exercise) => {
            const items = exercise.content
              ? extractExerciseHeadings(exercise.content)
              : [];
            const totalItems = items.length;
            const doneItems = Math.min(
              totalItems,
              getCompletedExerciseCount(exercise.id)
            );
            const pct =
              totalItems > 0
                ? Math.round((doneItems / totalItems) * 100)
                : 0;

            return (
              <div
                key={exercise.id}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 transition hover:border-emerald-700/60 hover:bg-zinc-900"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-emerald-700/60 bg-emerald-900/80 px-2 py-0.5 text-xs font-semibold text-emerald-100">
                      Day {exercise.day.dayNumber}
                    </span>
                    {totalItems > 0 && (
                      <span className="rounded-full border border-teal-800/60 bg-teal-950/70 px-2.5 py-0.5 text-xs font-medium text-teal-300">
                        {totalItems}{" "}
                        {totalItems === 1 ? "Exercise" : "Exercises"}
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/exercises/${exercise.id}`}
                    className="mt-3 block text-lg font-bold text-zinc-100 transition group-hover:text-emerald-300"
                  >
                    {exercise.title}
                  </Link>

                  {exercise.description && (
                    <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                      {exercise.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 space-y-4 border-t border-zinc-800/80 pt-4">
                  {totalItems > 0 && (
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1 text-zinc-400">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          Progress
                        </span>
                        <span className="font-medium text-zinc-300">
                          {doneItems} / {totalItems}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/?day=${exercise.day.dayNumber}`}
                        className="text-xs font-medium text-zinc-400 transition hover:text-emerald-300"
                      >
                        View Day {exercise.day.dayNumber}
                      </Link>
                      {exercise.url && (
                        <a
                          href={exercise.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open source document"
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Source
                        </a>
                      )}
                    </div>

                    <Link
                      to={`/exercises/${exercise.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-700"
                    >
                      Open Challenges
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
          )}
        </>
      )}
    </div>
  );
}
