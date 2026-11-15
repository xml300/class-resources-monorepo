import { useMemo, useState, type FormEvent } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  FolderOpen,
  KeyRound,
  Layers,
  Lock,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  type ResourceDTO,
  type ResourceType,
} from "@repo/shared";
import { useDays } from "../context/DaysContext";
import { ResourceBadge } from "../components/ResourceBadge";
import { MarkdownContent } from "../components/MarkdownContent";
import {
  StudentSidebar,
  useStudentSidebar,
} from "../layouts/StudentLayout";
import { api, ApiError } from "../lib/api";

function isMarkdownUrl(url: string): boolean {
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  return clean.endsWith(".md") || clean.endsWith(".markdown");
}

export function HomePage() {
  const { days, activeDay, refreshDays, loading, error } = useDays();
  const { closeSidebar } = useStudentSidebar();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<ResourceType | "ALL">("ALL");
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null
  );
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(
    null
  );
  const [expandedMarkdownIds, setExpandedMarkdownIds] = useState<
    Record<string, boolean>
  >({});
  const [fetchedMarkdown, setFetchedMarkdown] = useState<
    Record<string, string>
  >({});
  const [loadingMarkdownIds, setLoadingMarkdownIds] = useState<
    Record<string, boolean>
  >({});
  const [markdownErrors, setMarkdownErrors] = useState<Record<string, string>>(
    {}
  );

  const toggleMarkdownResource = async (resource: ResourceDTO) => {
    const isExpanded = Boolean(expandedMarkdownIds[resource.id]);
    setExpandedMarkdownIds((prev) => ({
      ...prev,
      [resource.id]: !isExpanded,
    }));

    if (
      !isExpanded &&
      !resource.content &&
      isMarkdownUrl(resource.url) &&
      fetchedMarkdown[resource.id] === undefined &&
      !loadingMarkdownIds[resource.id]
    ) {
      setLoadingMarkdownIds((prev) => ({ ...prev, [resource.id]: true }));
      setMarkdownErrors((prev) => {
        const next = { ...prev };
        delete next[resource.id];
        return next;
      });
      try {
        const res = await fetch(resource.url);
        if (!res.ok) {
          throw new Error(`Failed to load markdown (${res.status})`);
        }
        const text = await res.text();
        setFetchedMarkdown((prev) => ({ ...prev, [resource.id]: text }));
      } catch (err) {
        setMarkdownErrors((prev) => ({
          ...prev,
          [resource.id]:
            err instanceof Error ? err.message : "Unable to load markdown file",
        }));
      } finally {
        setLoadingMarkdownIds((prev) => ({ ...prev, [resource.id]: false }));
      }
    }
  };

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeDay) return;
    setUnlockError(null);
    setUnlocking(true);
    try {
      await api.unlockDay(activeDay.id, password);
      setPassword("");
      setRemainingAttempts(null);
      setRetryAfterSeconds(null);
      await refreshDays();
    } catch (err) {
      if (err instanceof ApiError) {
        setUnlockError(err.message);
        setRemainingAttempts(
          typeof err.remainingAttempts === "number"
            ? err.remainingAttempts
            : null
        );
        setRetryAfterSeconds(
          typeof err.retryAfterSeconds === "number"
            ? err.retryAfterSeconds
            : null
        );
      } else {
        setUnlockError(
          err instanceof Error ? err.message : "Failed to unlock day"
        );
      }
    } finally {
      setUnlocking(false);
    }
  };

  const filteredResources = useMemo(() => {
    if (!activeDay) return [];
    const q = search.trim().toLowerCase();
    return activeDay.resources.filter((res) => {
      const typeMatches = selectedType === "ALL" || res.type === selectedType;
      const textMatches =
        !q ||
        res.title.toLowerCase().includes(q) ||
        (res.description ?? "").toLowerCase().includes(q);
      return typeMatches && textMatches;
    });
  }, [activeDay, search, selectedType]);

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">
          <p className="font-medium">Unable to load class materials</p>
          <p className="mt-1 text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (days.length === 0 || !activeDay) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-zinc-500" />
          <h2 className="mt-3 text-base font-semibold text-zinc-100">
            No class days published yet
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Check back soon for daily lecture slides, readings, and assignments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <StudentSidebar
        icon={<Layers className="h-4 w-4 text-emerald-400" />}
        title={`Day ${activeDay.dayNumber} Contents`}
        badge={
          activeDay.isLocked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/80 px-2 py-0.5 text-xs font-medium text-amber-300">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          ) : (
            <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-300">
              {activeDay.resources.length}
            </span>
          )
        }
      >
        {activeDay.isLocked ? (
          <p className="py-2 text-xs text-zinc-500 italic">
            Enter the day password to view materials.
          </p>
        ) : activeDay.resources.length === 0 ? (
          <p className="py-2 text-xs text-zinc-500 italic">
            No materials posted for this day yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {activeDay.resources.map((res, idx) => (
              <li key={res.id}>
                <a
                  href={`#resource-${res.id}`}
                  onClick={() => {
                    setSelectedType("ALL");
                    setSearch("");
                    closeSidebar();
                  }}
                  className="group flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-sm transition hover:bg-zinc-800/80"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-[11px] font-medium text-zinc-400 group-hover:bg-emerald-900/80 group-hover:text-emerald-200">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-200 group-hover:text-emerald-300">
                      {res.title}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {RESOURCE_TYPE_LABELS[res.type]}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </StudentSidebar>

      <div className="space-y-6">
          {activeDay.isLocked ? (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 sm:p-10">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-700/60 bg-amber-950/70 text-amber-300">
                  <Lock className="h-6 w-6" />
                </div>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="inline-flex items-center rounded-md border border-emerald-700/60 bg-emerald-900 px-2.5 py-0.5 text-xs font-semibold text-emerald-100">
                    Day {activeDay.dayNumber}
                  </span>
                  {activeDay.date && (
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                      <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                      {formatDate(activeDay.date)}
                    </span>
                  )}
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100">
                  {activeDay.title}
                </h1>
                <p className="mt-2 text-sm text-zinc-400">
                  This day&apos;s materials are password-protected. Enter the
                  class password to unlock them on this device.
                </p>

                {unlockError && (
                  <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-900/70 bg-red-950/50 p-3.5 text-left text-sm text-red-300">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <div>
                      <p className="font-medium">{unlockError}</p>
                      {remainingAttempts !== null && remainingAttempts > 0 && (
                        <p className="mt-0.5 text-xs text-red-400">
                          {remainingAttempts}{" "}
                          {remainingAttempts === 1 ? "attempt" : "attempts"}{" "}
                          remaining before temporary lockout.
                        </p>
                      )}
                      {retryAfterSeconds !== null && (
                        <p className="mt-0.5 text-xs text-red-400">
                          Try again in{" "}
                          {retryAfterSeconds >= 60
                            ? `${Math.ceil(retryAfterSeconds / 60)} minute(s)`
                            : `${retryAfterSeconds} second(s)`}
                          .
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleUnlock} className="mt-6 space-y-3">
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter day password..."
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2.5 pr-3.5 pl-10 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/25 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={unlocking}
                    className="w-full rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {unlocking ? "Verifying..." : "Unlock Day"}
                  </button>
                </form>
              </div>
            </section>
          ) : (
            <>
          {/* Active Day Header */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center rounded-md border border-emerald-700/60 bg-emerald-900 px-2.5 py-0.5 text-xs font-semibold text-emerald-100">
                  Day {activeDay.dayNumber}
                </span>
                {activeDay.date && (
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                    {formatDate(activeDay.date)}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-zinc-500">
                {activeDay.resources.length}{" "}
                {activeDay.resources.length === 1 ? "resource" : "resources"}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
              {activeDay.title}
            </h1>

            {activeDay.summary && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {activeDay.summary}
              </p>
            )}

            {/* Search & Type Filter */}
            <div className="mt-5 flex flex-col gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-sm flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter today's materials..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 pr-3 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/25 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedType("ALL")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    selectedType === "ALL"
                      ? "bg-emerald-800 text-emerald-50"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  All
                </button>
                {RESOURCE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      selectedType === type
                        ? "bg-emerald-800 text-emerald-50"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    {RESOURCE_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Resource Cards */}
          {filteredResources.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-500">
              {activeDay.resources.length === 0
                ? "No materials have been posted for this day yet."
                : "No materials match your current search or filter."}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResources.map((resource) => {
                const hasMarkdown =
                  Boolean(resource.content) || isMarkdownUrl(resource.url);
                const isExpanded = Boolean(expandedMarkdownIds[resource.id]);
                const markdownBody =
                  resource.content ?? fetchedMarkdown[resource.id];
                const isLoadingMd = Boolean(loadingMarkdownIds[resource.id]);
                const mdError = markdownErrors[resource.id];

                if (!hasMarkdown) {
                  return (
                    <a
                      key={resource.id}
                      id={`resource-${resource.id}`}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex scroll-mt-24 items-start justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 transition hover:border-emerald-700/70 hover:bg-zinc-900"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <ResourceBadge type={resource.type} />
                          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-emerald-300">
                            {resource.title}
                          </h3>
                        </div>
                        {resource.description && (
                          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                            {resource.description}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-emerald-400" />
                    </a>
                  );
                }

                return (
                  <div
                    key={resource.id}
                    id={`resource-${resource.id}`}
                    className="scroll-mt-24 rounded-2xl border border-zinc-800 bg-zinc-900/80 transition hover:border-emerald-700/70"
                  >
                    <div className="flex items-start justify-between gap-4 p-5">
                      <button
                        type="button"
                        onClick={() => void toggleMarkdownResource(resource)}
                        className="group min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2.5">
                          <ResourceBadge type={resource.type} />
                          <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                            <FileText className="h-3 w-3 text-emerald-400" />
                            Markdown
                          </span>
                          <h3 className="text-base font-semibold text-zinc-100 group-hover:text-emerald-300">
                            {resource.title}
                          </h3>
                        </div>
                        {resource.description && (
                          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                            {resource.description}
                          </p>
                        )}
                      </button>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleMarkdownResource(resource)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/90 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-700 hover:bg-emerald-950/60 hover:text-emerald-200"
                        >
                          {isExpanded ? (
                            <>
                              Hide
                              <ChevronUp className="h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              Read
                              <ChevronDown className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open source link"
                          aria-label={`Open ${resource.title} in new tab`}
                          className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 transition hover:border-zinc-700 hover:text-emerald-400"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-zinc-800/90 bg-zinc-950/40 px-5 py-4">
                        {isLoadingMd ? (
                          <div className="flex items-center gap-2 py-4 text-xs text-zinc-400">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                            Loading markdown...
                          </div>
                        ) : mdError ? (
                          <p className="text-xs text-red-400">{mdError}</p>
                        ) : markdownBody ? (
                          <MarkdownContent content={markdownBody} />
                        ) : (
                          <p className="text-xs text-zinc-500 italic">
                            No markdown content available.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
            </>
          )}
      </div>
    </>
  );
}
