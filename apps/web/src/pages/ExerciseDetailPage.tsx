import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ClipboardList,
  ExternalLink,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import type { ResourceWithDayDTO } from "@repo/shared";
import { api } from "../lib/api";
import {
  extractExerciseHeadings,
  MarkdownContent,
} from "../components/MarkdownContent";
import { StudentSidebar, useStudentSidebar } from "../layouts/StudentLayout";

function isMarkdownUrl(url: string | null): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  return clean.endsWith(".md") || clean.endsWith(".markdown");
}

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { closeSidebar } = useStudentSidebar();
  const [exercise, setExercise] = useState<ResourceWithDayDTO | null>(null);
  const [fetchedMarkdown, setFetchedMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setFetchedMarkdown(null);
        const data = await api.getPublicExercise(id);
        if (!active) return;
        setExercise(data);

        try {
          const saved = localStorage.getItem(`exercise-progress:${id}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) setCompletedIds(parsed);
          } else {
            setCompletedIds([]);
          }
        } catch {
          setCompletedIds([]);
        }

        if (!data.content && data.url && isMarkdownUrl(data.url)) {
          const res = await fetch(data.url, { cache: "no-store" });
          if (res.ok && active) {
            setFetchedMarkdown(await res.text());
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load coding exercise"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const handleRefresh = async () => {
    if (!exercise || refreshing) return;
    setRefreshing(true);
    try {
      await api.refreshResourceMarkdown(exercise.dayId, exercise.id);
      const updated = await api.getPublicExercise(exercise.id);
      setExercise(updated);
      if (!updated.content && updated.url && isMarkdownUrl(updated.url)) {
        const res = await fetch(updated.url, { cache: "no-store" });
        if (res.ok) {
          setFetchedMarkdown(await res.text());
        }
      }
    } catch {
      // Keep existing view on transient refresh failure
    } finally {
      setRefreshing(false);
    }
  };

  const markdownBody = exercise?.content ?? fetchedMarkdown ?? "";

  const exerciseItems = useMemo(
    () => (markdownBody ? extractExerciseHeadings(markdownBody) : []),
    [markdownBody]
  );

  const toggleItem = (itemId: string) => {
    if (!exercise) return;
    setCompletedIds((prev) => {
      const next = prev.includes(itemId)
        ? prev.filter((x) => x !== itemId)
        : [...prev, itemId];
      try {
        localStorage.setItem(
          `exercise-progress:${exercise.id}`,
          JSON.stringify(next)
        );
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const resetProgress = () => {
    if (!exercise) return;
    setCompletedIds([]);
    try {
      localStorage.removeItem(`exercise-progress:${exercise.id}`);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div>
        <Link
          to="/exercises"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Coding Exercises
        </Link>
        <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">
          {error || "Coding exercise not found"}
        </div>
      </div>
    );
  }

  const totalItems = exerciseItems.length;
  const doneCount = exerciseItems.filter((item) =>
    completedIds.includes(item.id)
  ).length;
  const pct = totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      <StudentSidebar
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        title="Exercise Checklist"
        badge={
          totalItems > 0 ? (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
              {doneCount}/{totalItems}
            </span>
          ) : undefined
        }
      >
        {totalItems === 0 ? (
          <p className="text-xs text-zinc-500 italic">
            No individual exercise sections detected.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Your progress</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-300">{pct}%</span>
                  {doneCount > 0 && (
                    <button
                      type="button"
                      onClick={resetProgress}
                      className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </button>
                  )}
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <ul className="space-y-1.5">
              {exerciseItems.map((item) => {
                const checked = completedIds.includes(item.id);
                return (
                  <li key={item.id}>
                    <div
                      className={`flex items-start gap-2 rounded-xl border p-2 transition ${
                        checked
                          ? "border-emerald-800/60 bg-emerald-950/30"
                          : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        aria-label={`Mark "${item.text}" as ${checked ? "incomplete" : "complete"}`}
                        className="mt-0.5 shrink-0"
                      >
                        {checked ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-zinc-500 hover:text-zinc-300" />
                        )}
                      </button>
                      <a
                        href={`#${item.id}`}
                        onClick={closeSidebar}
                        className={`min-w-0 flex-1 text-xs leading-snug font-medium transition hover:text-emerald-300 ${
                          checked
                            ? "text-emerald-200 line-through decoration-emerald-700"
                            : "text-zinc-200"
                        }`}
                      >
                        {item.text}
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </StudentSidebar>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/exercises"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          All Coding Exercises
        </Link>
        <Link
          to={`/?day=${exercise.day.dayNumber}`}
          className="text-xs font-medium text-zinc-400 transition hover:text-emerald-300"
        >
          Back to Day {exercise.day.dayNumber} Materials
        </Link>
      </div>

      {/* Metadata Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-800/60 bg-teal-950/70 px-2.5 py-0.5 text-xs font-medium text-teal-300">
            <ClipboardList className="h-3.5 w-3.5" />
            Coding Exercises
          </span>
          <Link
            to={`/?day=${exercise.day.dayNumber}`}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-700 hover:text-emerald-300"
          >
            Day {exercise.day.dayNumber}: {exercise.day.title}
          </Link>
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
          {exercise.title}
        </h1>
        {exercise.description && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-300">
            {exercise.description}
          </p>
        )}

        {exercise.url && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4">
            <a
              href={exercise.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Source Document
            </a>
          </div>
        )}
      </div>

      {/* Exercise Content */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Exercise Sheet
          </h2>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            title="Refresh exercise content"
            aria-label="Refresh exercise content"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300 transition hover:border-emerald-700 hover:bg-emerald-950/60 hover:text-emerald-200 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {markdownBody ? (
          <MarkdownContent content={markdownBody} />
        ) : (
          <p className="text-sm text-zinc-500 italic">
            No inline exercise content available.{" "}
            {exercise.url ? (
              <a
                href={exercise.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 underline"
              >
                Open external link
              </a>
            ) : null}
          </p>
        )}
      </div>
    </div>
  );
}
