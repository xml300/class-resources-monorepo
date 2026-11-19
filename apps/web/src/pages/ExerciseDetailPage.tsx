import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  ExternalLink,
  GalleryHorizontalEnd,
  RefreshCw,
  RotateCcw,
  ScrollText,
} from "lucide-react";
import type { ResourceWithDayDTO } from "@repo/shared";
import { api } from "../lib/api";
import { useDays } from "../context/DaysContext";
import { ChallengeWorkspace } from "../components/ChallengeWorkspace";
import {
  extractExerciseHeadings,
  MarkdownContent,
  splitExerciseSections,
} from "../components/MarkdownContent";
import { StudentSidebar, useStudentSidebar } from "../layouts/StudentLayout";

type ViewMode = "steps" | "full";
type SlideDirection = "next" | "prev" | "none";

const VIEW_MODE_STORAGE_KEY = "exercise-view-mode";

function getInitialViewMode(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (saved === "full" || saved === "steps") return saved;
  } catch {
    // ignore storage errors
  }
  return "steps";
}

function isMarkdownUrl(url: string | null): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  return clean.endsWith(".md") || clean.endsWith(".markdown");
}

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { closeSidebar } = useStudentSidebar();
  const { syncActiveDayNumber } = useDays();
  const [exercise, setExercise] = useState<ResourceWithDayDTO | null>(null);
  const [fetchedMarkdown, setFetchedMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>("none");
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setFetchedMarkdown(null);
        setActiveSlideIndex(0);
        setSlideDirection("none");
        const data = await api.getPublicExercise(id);
        if (!active) return;
        setExercise(data);
        syncActiveDayNumber(data.day.dayNumber);

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
  }, [id, syncActiveDayNumber]);

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

  const sections = useMemo(() => {
    if (!markdownBody) return [];
    const split = splitExerciseSections(markdownBody);
    if (split.length > 0) return split;
    return [
      {
        id: "challenge-main",
        title: exercise?.title ?? "Coding Challenge",
        content: markdownBody,
        isOverview: false,
      },
    ];
  }, [markdownBody, exercise?.title]);

  const canPaginate = sections.length > 0;
  const isStepMode = canPaginate && viewMode === "steps";
  const hasOverview = sections.length > 0 && sections[0].isOverview;

  const stepParam = searchParams.get("step");
  const hashTarget = location.hash ? location.hash.slice(1) : "";

  // Sync active slide index from URL ?step= or #hash when sections load or URL changes
  useEffect(() => {
    if (sections.length === 0) {
      setActiveSlideIndex(0);
      return;
    }
    const targetId = stepParam || hashTarget;
    if (targetId) {
      const foundIdx = sections.findIndex((s) => s.id === targetId);
      if (foundIdx !== -1) {
        setActiveSlideIndex(foundIdx);
        return;
      }
    }
    setActiveSlideIndex((prev) =>
      prev >= 0 && prev < sections.length ? prev : 0
    );
  }, [sections, stepParam, hashTarget]);

  const handleViewModeChange = (nextMode: ViewMode) => {
    setViewMode(nextMode);
    setSlideDirection("none");
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, nextMode);
    } catch {
      // ignore storage errors
    }
  };

  const goToSlide = useCallback(
    (nextIndex: number, options?: { scrollToCard?: boolean }) => {
      if (sections.length === 0) return;
      const clamped = Math.max(0, Math.min(sections.length - 1, nextIndex));
      if (clamped === activeSlideIndex) return;

      setSlideDirection(clamped > activeSlideIndex ? "next" : "prev");
      setActiveSlideIndex(clamped);

      const nextSection = sections[clamped];
      setSearchParams(
        (prev) => {
          const updated = new URLSearchParams(prev);
          updated.set("step", nextSection.id);
          return updated;
        },
        { replace: true }
      );

      if (options?.scrollToCard !== false && sheetRef.current) {
        const rect = sheetRef.current.getBoundingClientRect();
        if (rect.top < 80) {
          sheetRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    },
    [activeSlideIndex, sections, setSearchParams]
  );

  // Keyboard arrow navigation in step-by-step mode
  useEffect(() => {
    if (!isStepMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowLeft" && activeSlideIndex > 0) {
        e.preventDefault();
        goToSlide(activeSlideIndex - 1);
      } else if (
        e.key === "ArrowRight" &&
        activeSlideIndex < sections.length - 1
      ) {
        e.preventDefault();
        goToSlide(activeSlideIndex + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isStepMode, activeSlideIndex, sections.length, goToSlide]);

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

  const markComplete = (itemId: string) => {
    if (!exercise) return;
    setCompletedIds((prev) => {
      if (prev.includes(itemId)) return prev;
      const next = [...prev, itemId];
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

  const activeSection = sections[activeSlideIndex] ?? null;
  const prevSection =
    activeSlideIndex > 0 ? sections[activeSlideIndex - 1] : null;
  const nextSection =
    activeSlideIndex < sections.length - 1
      ? sections[activeSlideIndex + 1]
      : null;

  const activeExerciseNumber =
    activeSection && !activeSection.isOverview
      ? activeSlideIndex - (hasOverview ? 1 : 0) + 1
      : null;

  const isActiveCompleted =
    activeSection && !activeSection.isOverview
      ? completedIds.includes(activeSection.id)
      : false;

  const slideAnimationClass =
    slideDirection === "next"
      ? "animate-exercise-next"
      : slideDirection === "prev"
        ? "animate-exercise-prev"
        : "";

  const handleCompleteAndNext = () => {
    if (!activeSection || activeSection.isOverview) return;
    markComplete(activeSection.id);
    if (nextSection) {
      goToSlide(activeSlideIndex + 1);
    }
  };

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
              {isStepMode && hasOverview && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      goToSlide(0);
                      closeSidebar();
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left text-xs font-medium transition ${
                      activeSection?.id === "overview"
                        ? "border-emerald-500/70 bg-emerald-950/50 text-emerald-200 ring-1 ring-emerald-500/30"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700 hover:text-emerald-300"
                    }`}
                  >
                    <BookOpen className="h-4 w-4 shrink-0 text-teal-400" />
                    <span className="truncate">Overview</span>
                  </button>
                </li>
              )}

              {exerciseItems.map((item, idx) => {
                const checked = completedIds.includes(item.id);
                const sectionIdx = idx + (hasOverview ? 1 : 0);
                const isActive = isStepMode && activeSection?.id === item.id;

                return (
                  <li key={item.id}>
                    <div
                      className={`flex items-start gap-2 rounded-xl border p-2 transition ${
                        isActive
                          ? "border-emerald-500/70 bg-emerald-950/50 ring-1 ring-emerald-500/30"
                          : checked
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
                      {isStepMode ? (
                        <button
                          type="button"
                          onClick={() => {
                            goToSlide(sectionIdx);
                            closeSidebar();
                          }}
                          className={`min-w-0 flex-1 text-left text-xs leading-snug font-medium transition hover:text-emerald-300 ${
                            checked
                              ? "text-emerald-200 line-through decoration-emerald-700"
                              : isActive
                                ? "text-emerald-200"
                                : "text-zinc-200"
                          }`}
                        >
                          {item.text}
                        </button>
                      ) : (
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
                      )}
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
          to={`/exercises?day=${exercise.day.dayNumber}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Day {exercise.day.dayNumber} Challenges
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
            Coding Challenges
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
      <div
        ref={sheetRef}
        className="scroll-mt-20 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              {isStepMode ? "Challenge Workspace" : "Exercise Sheet"}
            </h2>
            {isStepMode && activeSection && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/80 bg-zinc-800/80 px-2.5 py-0.5 text-xs font-medium text-zinc-200">
                {activeSection.isOverview ? (
                  <>
                    <BookOpen className="h-3 w-3 text-teal-400" />
                    Overview
                  </>
                ) : (
                  <>
                    Challenge {activeExerciseNumber} of {Math.max(1, totalItems)}
                    {isActiveCompleted && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </>
                )}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canPaginate && (
              <div
                role="group"
                aria-label="Exercise view mode"
                className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950/90 p-0.5"
              >
                <button
                  type="button"
                  onClick={() => handleViewModeChange("steps")}
                  aria-pressed={viewMode === "steps"}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    viewMode === "steps"
                      ? "bg-emerald-800/90 text-emerald-50 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <GalleryHorizontalEnd className="h-3.5 w-3.5" />
                  Challenge
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange("full")}
                  aria-pressed={viewMode === "full"}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    viewMode === "full"
                      ? "bg-emerald-800/90 text-emerald-50 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <ScrollText className="h-3.5 w-3.5" />
                  Full sheet
                </button>
              </div>
            )}

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
        </div>

        {/* Top Stepper Bar (Step-by-step mode) */}
        {isStepMode && sections.length > 1 && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-zinc-800/90 bg-zinc-950/60 px-3 py-2.5">
            <button
              type="button"
              onClick={() => goToSlide(activeSlideIndex - 1)}
              disabled={!prevSection}
              aria-label="Previous slide"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {sections.map((section, idx) => {
                const isCurrent = idx === activeSlideIndex;
                const isDone =
                  !section.isOverview && completedIds.includes(section.id);
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => goToSlide(idx)}
                    title={section.title}
                    aria-label={`Go to ${section.title}`}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`h-2 flex-1 rounded-full transition-all ${
                      isCurrent
                        ? "bg-emerald-400 ring-2 ring-emerald-400/30"
                        : isDone
                          ? "bg-emerald-700/80 hover:bg-emerald-600"
                          : "bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  />
                );
              })}
            </div>

            <span className="shrink-0 text-xs font-medium text-zinc-400 tabular-nums">
              {activeSlideIndex + 1} / {sections.length}
            </span>

            <button
              type="button"
              onClick={() => goToSlide(activeSlideIndex + 1)}
              disabled={!nextSection}
              aria-label="Next slide"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {markdownBody ? (
          isStepMode && activeSection ? (
            <div>
              <div
                key={activeSection.id}
                className={`min-h-[14rem] ${slideAnimationClass}`}
              >
                {activeSection.isOverview ? (
                  <MarkdownContent content={activeSection.content} />
                ) : (
                  <ChallengeWorkspace
                    resourceId={exercise.id}
                    sectionId={activeSection.id}
                    title={activeSection.title}
                    markdown={activeSection.content}
                    isCompleted={isActiveCompleted}
                    onPassed={() => markComplete(activeSection.id)}
                  />
                )}
              </div>

              {/* Bottom Side-to-Side Navigation Footer */}
              <div className="mt-8 border-t border-zinc-800 pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Previous Button */}
                  <div className="sm:w-1/3">
                    {prevSection ? (
                      <button
                        type="button"
                        onClick={() => goToSlide(activeSlideIndex - 1)}
                        className="group flex w-full items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2.5 text-left transition hover:border-emerald-700/70 hover:bg-zinc-900"
                      >
                        <ChevronLeft className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:-translate-x-0.5 group-hover:text-emerald-300" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-zinc-500">Previous</p>
                          <p className="truncate text-xs font-medium text-zinc-200 group-hover:text-emerald-200">
                            {prevSection.title}
                          </p>
                        </div>
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>

                  {/* Center Complete / Complete & Next Action */}
                  <div className="flex justify-center sm:w-1/3">
                    {!activeSection.isOverview &&
                      (isActiveCompleted ? (
                        <button
                          type="button"
                          onClick={() => toggleItem(activeSection.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-700/70 bg-emerald-950/60 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:border-emerald-600 hover:bg-emerald-950"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Completed
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleCompleteAndNext}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {nextSection ? "Complete & Next" : "Mark Complete"}
                          {nextSection && (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ))}
                  </div>

                  {/* Next Button */}
                  <div className="sm:w-1/3">
                    {nextSection ? (
                      <button
                        type="button"
                        onClick={() => goToSlide(activeSlideIndex + 1)}
                        className="group flex w-full items-center justify-end gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2.5 text-right transition hover:border-emerald-700/70 hover:bg-zinc-900"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] text-zinc-500">
                            {activeSection.isOverview
                              ? "Start Exercises"
                              : "Next"}
                          </p>
                          <p className="truncate text-xs font-medium text-zinc-200 group-hover:text-emerald-200">
                            {nextSection.title}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-300" />
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                </div>

                <p className="mt-3 hidden text-center text-[11px] text-zinc-500 sm:block">
                  Use <kbd className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">←</kbd>{" "}
                  <kbd className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">→</kbd> arrow keys to navigate
                </p>
              </div>
            </div>
          ) : (
            <MarkdownContent content={markdownBody} />
          )
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
