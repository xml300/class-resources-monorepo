import { useMemo, useState } from "react";
import {
  Calendar,
  ExternalLink,
  FolderOpen,
  Layers,
  Search,
} from "lucide-react";
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  type ResourceType,
} from "@repo/shared";
import { useDays } from "../context/DaysContext";
import { ResourceBadge } from "../components/ResourceBadge";

export function HomePage() {
  const { days, activeDay, loading, error } = useDays();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<ResourceType | "ALL">("ALL");

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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Sidebar: All content of the active day */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="sticky top-24 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                <h2 className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">
                  Day {activeDay.dayNumber} Contents
                </h2>
              </div>
              <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-300">
                {activeDay.resources.length}
              </span>
            </div>

            {activeDay.resources.length === 0 ? (
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
          </div>
        </aside>

        {/* Main Content: Active Day Details + Resources */}
        <div className="space-y-6 lg:col-span-8 xl:col-span-9">
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
              {filteredResources.map((resource) => (
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
