import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  Download,
  FileText,
  FolderGit2,
  Play,
  Rocket,
  Search,
  Sparkles,
} from "lucide-react";
import {
  PROJECT_DIFFICULTIES,
  PROJECT_DIFFICULTY_LABELS,
  type MiniProjectDTO,
  type ProjectDifficulty,
} from "@repo/shared";
import { api } from "../lib/api";
import { ContentToggle } from "../components/ContentToggle";

const DIFFICULTY_STYLES: Record<ProjectDifficulty, string> = {
  BEGINNER:
    "border-emerald-700/60 bg-emerald-950/80 text-emerald-300",
  INTERMEDIATE:
    "border-sky-700/60 bg-sky-950/80 text-sky-300",
  ADVANCED:
    "border-purple-700/60 bg-purple-950/80 text-purple-300",
};

function getCompletedMilestoneCount(projectId: string): number {
  try {
    const raw = localStorage.getItem(`mini-project-progress:${projectId}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<MiniProjectDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<ProjectDifficulty | "ALL">(
    "ALL"
  );
  const [selectedTag, setSelectedTag] = useState<string | "ALL">("ALL");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await api.getPublicMiniProjects();
        if (active) setProjects(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load mini projects"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const diffOk = difficulty === "ALL" || p.difficulty === difficulty;
      const tagOk = selectedTag === "ALL" || p.tags.includes(selectedTag);
      const textOk =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.summary ?? "").toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return diffOk && tagOk && textOk;
    });
  }, [projects, search, difficulty, selectedTag]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">
          <p className="font-medium">Unable to load mini projects</p>
          <p className="mt-1 text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-5">
        <ContentToggle />
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/40 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/50 bg-emerald-950/80 px-3 py-1 text-xs font-medium text-emerald-300">
              <Rocket className="h-3.5 w-3.5" />
              Hands-on Practice
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
              Mini Projects
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Guided builds with starter repositories, live demos, specs, and
              interactive milestone checklists.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 font-medium text-zinc-200">
              {projects.length}{" "}
              {projects.length === 1 ? "Project" : "Projects"} Available
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      {projects.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects, stack, or topics..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pr-3 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDifficulty("ALL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  difficulty === "ALL"
                    ? "bg-emerald-800 text-emerald-50"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                All Levels
              </button>
              {PROJECT_DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    difficulty === d
                      ? "bg-emerald-800 text-emerald-50"
                      : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {PROJECT_DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-zinc-500">Tags:</span>
              <button
                type="button"
                onClick={() => setSelectedTag("ALL")}
                className={`rounded-full px-2.5 py-0.5 text-xs transition ${
                  selectedTag === "ALL"
                    ? "bg-zinc-700 text-zinc-100"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`rounded-full px-2.5 py-0.5 text-xs transition ${
                    selectedTag === tag
                      ? "bg-emerald-900/80 text-emerald-200 ring-1 ring-emerald-700"
                      : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      {projects.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <FolderGit2 className="mx-auto h-10 w-10 text-zinc-500" />
          <h2 className="mt-3 text-base font-semibold text-zinc-100">
            No mini projects published yet
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Check back soon for hands-on coding projects and starter repos.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-10 text-center text-sm text-zinc-400">
          No mini projects match your current filters.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((project) => {
            const totalMilestones = project.milestones.length;
            const doneMilestones = getCompletedMilestoneCount(project.id);
            const pct =
              totalMilestones > 0
                ? Math.min(
                    100,
                    Math.round((doneMilestones / totalMilestones) * 100)
                  )
                : 0;

            return (
              <div
                key={project.id}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 transition hover:border-emerald-700/60 hover:bg-zinc-900"
              >
                <div>
                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${DIFFICULTY_STYLES[project.difficulty]}`}
                    >
                      {PROJECT_DIFFICULTY_LABELS[project.difficulty]}
                    </span>
                    {project.day && (
                      <span className="rounded-md border border-zinc-700 bg-zinc-800/90 px-2 py-0.5 text-xs font-medium text-zinc-300">
                        Day {project.day.dayNumber}
                      </span>
                    )}
                    {project.estimatedMinutes && (
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                        <Clock className="h-3.5 w-3.5" />
                        ~{project.estimatedMinutes} min
                      </span>
                    )}
                    {project.dueDate && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-300/90">
                        <Calendar className="h-3.5 w-3.5" />
                        Due{" "}
                        {new Date(project.dueDate).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" }
                        )}
                      </span>
                    )}
                  </div>

                  {/* Title & Summary */}
                  <Link
                    to={`/projects/${project.id}`}
                    className="mt-3 block text-lg font-bold text-zinc-100 transition group-hover:text-emerald-300"
                  >
                    {project.title}
                  </Link>
                  {project.summary && (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-400">
                      {project.summary}
                    </p>
                  )}

                  {/* Tags */}
                  {project.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 space-y-4 border-t border-zinc-800/80 pt-4">
                  {/* Milestone Progress */}
                  {totalMilestones > 0 && (
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1 text-zinc-400">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          Milestones
                        </span>
                        <span className="font-medium text-zinc-300">
                          {doneMilestones} / {totalMilestones}
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

                  {/* Quick Links & CTA */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {project.starterRepoUrl && (
                        <a
                          href={project.starterRepoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                        >
                          <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                          Starter
                        </a>
                      )}
                      {project.demoUrl && (
                        <a
                          href={project.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                        >
                          <Play className="h-3.5 w-3.5 text-sky-400" />
                          Demo
                        </a>
                      )}
                      {project.specUrl && (
                        <a
                          href={project.specUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                        >
                          <FileText className="h-3.5 w-3.5 text-amber-400" />
                          Spec
                        </a>
                      )}
                      {project.solutionUrl && (
                        <a
                          href={project.solutionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                          Solution
                        </a>
                      )}
                      {project.attachmentUrl && (
                        <a
                          href={project.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                        >
                          <Download className="h-3.5 w-3.5 text-zinc-400" />
                          Files
                        </a>
                      )}
                    </div>

                    <Link
                      to={`/projects/${project.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-700"
                    >
                      Open Workspace
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
