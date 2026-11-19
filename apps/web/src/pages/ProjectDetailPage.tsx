import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  PROJECT_DIFFICULTY_LABELS,
  type MiniProjectDTO,
  type ProjectDifficulty,
} from "@repo/shared";
import { api } from "../lib/api";
import { useDays } from "../context/DaysContext";
import { MarkdownContent } from "../components/MarkdownContent";
import { StudentSidebar } from "../layouts/StudentLayout";

const DIFFICULTY_STYLES: Record<ProjectDifficulty, string> = {
  BEGINNER:
    "border-emerald-700/60 bg-emerald-950/80 text-emerald-300",
  INTERMEDIATE:
    "border-sky-700/60 bg-sky-950/80 text-sky-300",
  ADVANCED:
    "border-purple-700/60 bg-purple-950/80 text-purple-300",
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { syncActiveDayNumber } = useDays();
  const [project, setProject] = useState<MiniProjectDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const handleRefresh = async () => {
    if (!id || refreshing) return;
    setRefreshing(true);
    try {
      const data = await api.getPublicMiniProject(id);
      setProject(data);
    } catch {
      // Keep existing project view on transient refresh failure
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await api.getPublicMiniProject(id);
        if (active) {
          setProject(data);
          if (data.day) {
            syncActiveDayNumber(data.day.dayNumber);
          }
          try {
            const saved = localStorage.getItem(`mini-project-progress:${id}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed)) setCompletedIds(parsed);
            }
          } catch {
            // ignore storage errors
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load mini project"
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

  const toggleMilestone = (milestoneId: string) => {
    if (!project) return;
    setCompletedIds((prev) => {
      const next = prev.includes(milestoneId)
        ? prev.filter((m) => m !== milestoneId)
        : [...prev, milestoneId];
      try {
        localStorage.setItem(
          `mini-project-progress:${project.id}`,
          JSON.stringify(next)
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  const resetProgress = () => {
    if (!project) return;
    setCompletedIds([]);
    try {
      localStorage.removeItem(`mini-project-progress:${project.id}`);
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

  if (error || !project) {
    return (
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Mini Projects
        </Link>
        <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">
          {error || "Mini project not found"}
        </div>
      </div>
    );
  }

  const artifacts = [
    project.starterRepoUrl && {
      label: "Starter Repository",
      sub: "Clone & get started",
      url: project.starterRepoUrl,
      icon: Code2,
      accent: "border-emerald-800/70 bg-emerald-950/50 text-emerald-300",
    },
    project.demoUrl && {
      label: "Live Demo",
      sub: "Preview expected output",
      url: project.demoUrl,
      icon: Play,
      accent: "border-sky-800/70 bg-sky-950/50 text-sky-300",
    },
    project.specUrl && {
      label: "Specification / Rubric",
      sub: "Detailed requirements",
      url: project.specUrl,
      icon: FileText,
      accent: "border-amber-800/70 bg-amber-950/50 text-amber-300",
    },
    project.solutionUrl && {
      label: "Reference Solution",
      sub: "Compare your approach",
      url: project.solutionUrl,
      icon: Sparkles,
      accent: "border-purple-800/70 bg-purple-950/50 text-purple-300",
    },
    project.attachmentUrl && {
      label: "Starter Files",
      sub: "Download archive",
      url: project.attachmentUrl,
      icon: Download,
      accent: "border-zinc-700 bg-zinc-900 text-zinc-200",
    },
  ].filter(Boolean) as {
    label: string;
    sub: string;
    url: string;
    icon: typeof Code2;
    accent: string;
  }[];

  const totalMilestones = project.milestones.length;
  const doneCount = project.milestones.filter((m) =>
    completedIds.includes(m.id)
  ).length;
  const pct =
    totalMilestones > 0 ? Math.round((doneCount / totalMilestones) * 100) : 0;

  return (
    <div className="space-y-6">
      <StudentSidebar
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        title="Milestones"
        badge={
          totalMilestones > 0 ? (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
              {doneCount}/{totalMilestones}
            </span>
          ) : undefined
        }
      >
        {totalMilestones === 0 ? (
          <p className="text-xs text-zinc-500 italic">
            No milestones defined for this project.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Your progress</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-300">
                    {pct}%
                  </span>
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

            <ul className="space-y-2">
              {project.milestones.map((m) => {
                const checked = completedIds.includes(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => toggleMilestone(m.id)}
                      className={`flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition ${
                        checked
                          ? "border-emerald-800/60 bg-emerald-950/30"
                          : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                      }`}
                    >
                      {checked ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-medium ${
                            checked
                              ? "text-emerald-200 line-through decoration-emerald-700"
                              : "text-zinc-200"
                          }`}
                        >
                          {m.title}
                        </p>
                        {m.description && (
                          <p className="mt-0.5 text-[11px] text-zinc-400">
                            {m.description}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </StudentSidebar>

      <div>
        <Link
          to={project.day ? `/projects?day=${project.day.dayNumber}` : "/projects"}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {project.day
            ? `Day ${project.day.dayNumber} Mini Projects`
            : "Mini Projects"}
        </Link>
      </div>

      {/* Metadata Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${DIFFICULTY_STYLES[project.difficulty]}`}
          >
            {PROJECT_DIFFICULTY_LABELS[project.difficulty]}
          </span>
          {project.day && (
            <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-200">
              Day {project.day.dayNumber}: {project.day.title}
            </span>
          )}
          {project.estimatedMinutes && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
              <Clock className="h-3.5 w-3.5" />
              ~{project.estimatedMinutes} min
            </span>
          )}
          {project.dueDate && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-300">
              <Calendar className="h-3.5 w-3.5" />
              Due{" "}
              {new Date(project.dueDate).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
          {project.title}
        </h1>
        {project.summary && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-300">
            {project.summary}
          </p>
        )}

        {project.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-0.5 text-xs font-medium text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Links & Artifacts Dock */}
        {artifacts.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-3 border-t border-zinc-800 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {artifacts.map((art) => {
              const Icon = art.icon;
              return (
                <a
                  key={art.label}
                  href={art.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition hover:brightness-110 ${art.accent}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {art.label}
                      </p>
                      <p className="truncate text-xs opacity-75">{art.sub}</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 opacity-70" />
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Rich Content */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Project Brief & Instructions
          </h2>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            title="Refresh project instructions"
            aria-label="Refresh project instructions"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300 transition hover:border-emerald-700 hover:bg-emerald-950/60 hover:text-emerald-200 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
        {project.instructions ? (
          <MarkdownContent content={project.instructions} />
        ) : (
          <p className="text-sm text-zinc-500 italic">
            No detailed instructions provided for this project yet.
          </p>
        )}
      </div>
    </div>
  );
}
