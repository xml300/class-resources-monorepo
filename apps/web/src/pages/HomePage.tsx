import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ExternalLink,
  FolderOpen,
  Search,
} from "lucide-react";
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  type DayWithResourcesDTO,
  type ResourceType,
} from "@repo/shared";
import { api } from "../lib/api";
import { ResourceBadge } from "../components/ResourceBadge";

export function HomePage() {
  const [days, setDays] = useState<DayWithResourcesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<ResourceType | "ALL">("ALL");

  useEffect(() => {
    api
      .getPublicDays()
      .then(setDays)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredDays = useMemo(() => {
    const q = search.trim().toLowerCase();
    return days
      .map((day) => {
        const dayMatchesQuery =
          !q ||
          day.title.toLowerCase().includes(q) ||
          (day.summary ?? "").toLowerCase().includes(q) ||
          `day ${day.dayNumber}`.includes(q);

        const matchingResources = day.resources.filter((res) => {
          const typeMatches =
            selectedType === "ALL" || res.type === selectedType;
          const textMatches =
            !q ||
            dayMatchesQuery ||
            res.title.toLowerCase().includes(q) ||
            (res.description ?? "").toLowerCase().includes(q);
          return typeMatches && textMatches;
        });

        return {
          ...day,
          resources: matchingResources,
          _dayMatchesQuery: dayMatchesQuery,
        };
      })
      .filter((day) => {
        if (selectedType !== "ALL") {
          return day.resources.length > 0;
        }
        if (q) {
          return day._dayMatchesQuery || day.resources.length > 0;
        }
        return true;
      });
  }, [days, search, selectedType]);

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-medium">Unable to load class materials</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero / Filter Bar */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Daily Class Resources
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Browse lecture slides, recordings, readings, code repositories, and
          assignments organized by class day.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search days or resources..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedType("ALL")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedType === "ALL"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {RESOURCE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">
            No class days published yet
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Check back soon or sign in to the Admin section to add days and
            materials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Sidebar Day Jumper */}
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Class Schedule
              </h2>
              <ul className="space-y-1">
                {filteredDays.map((day) => (
                  <li key={day.id}>
                    <a
                      href={`#day-${day.dayNumber}`}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <span className="truncate font-medium">
                        Day {day.dayNumber}: {day.title}
                      </span>
                      <span className="ml-2 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {day.resources.length}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main Day Cards */}
          <div className="space-y-6 lg:col-span-9">
            {filteredDays.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No resources match your current search or filter.
              </div>
            ) : (
              filteredDays.map((day) => (
                <section
                  key={day.id}
                  id={`day-${day.dayNumber}`}
                  className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center rounded-md bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                          Day {day.dayNumber}
                        </span>
                        {day.date && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(day.date)}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-2 text-xl font-semibold text-slate-900">
                        {day.title}
                      </h2>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {day.resources.length}{" "}
                      {day.resources.length === 1 ? "resource" : "resources"}
                    </span>
                  </div>

                  {day.summary && (
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      {day.summary}
                    </p>
                  )}

                  {day.resources.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400 italic">
                      No materials posted for this day yet.
                    </p>
                  ) : (
                    <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50">
                      {day.resources.map((resource) => (
                        <a
                          key={resource.id}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-start justify-between gap-4 p-4 transition first:rounded-t-xl last:rounded-b-xl hover:bg-white"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <ResourceBadge type={resource.type} />
                              <span className="font-medium text-slate-900 group-hover:text-indigo-600">
                                {resource.title}
                              </span>
                            </div>
                            {resource.description && (
                              <p className="mt-1 text-sm text-slate-500">
                                {resource.description}
                              </p>
                            )}
                          </div>
                          <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-600" />
                        </a>
                      ))}
                    </div>
                  )}
                </section>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
