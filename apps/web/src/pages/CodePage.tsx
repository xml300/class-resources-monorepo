import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Code2,
  ExternalLink,
  FileCode2,
  Search,
} from "lucide-react";
import {
  CODE_LANGUAGE_LABELS,
  inferCodeLanguage,
  type CodeLanguage,
  type ResourceWithDayDTO,
} from "@repo/shared";
import { api } from "../lib/api";
import { StudentSidebar, useStudentSidebar } from "../layouts/StudentLayout";

export function CodePage() {
  const { closeSidebar } = useStudentSidebar();
  const [items, setItems] = useState<ResourceWithDayDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | "ALL">("ALL");
  const [selectedLang, setSelectedLang] = useState<CodeLanguage | "ALL">("ALL");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await api.getPublicCodeResources();
        if (active) setItems(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load code resources"
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

  const enriched = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        resolvedLanguage: inferCodeLanguage(
          item.filename || item.url,
          item.language
        ),
      })),
    [items]
  );

  const availableDays = useMemo(() => {
    const set = new Set<number>();
    for (const item of enriched) set.add(item.day.dayNumber);
    return Array.from(set).sort((a, b) => a - b);
  }, [enriched]);

  const availableLanguages = useMemo(() => {
    const set = new Set<CodeLanguage>();
    for (const item of enriched) {
      if (item.resolvedLanguage) set.add(item.resolvedLanguage);
    }
    return Array.from(set).sort();
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((item) => {
      const dayOk =
        selectedDay === "ALL" || item.day.dayNumber === selectedDay;
      const langOk =
        selectedLang === "ALL" || item.resolvedLanguage === selectedLang;
      const textOk =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q) ||
        (item.filename ?? "").toLowerCase().includes(q) ||
        (item.resolvedLanguage ?? "").toLowerCase().includes(q) ||
        item.day.title.toLowerCase().includes(q);
      return dayOk && langOk && textOk;
    });
  }, [enriched, search, selectedDay, selectedLang]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">
        <p className="font-medium">Unable to load code library</p>
        <p className="mt-1 text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StudentSidebar
        icon={<Code2 className="h-4 w-4 text-emerald-400" />}
        title="Code Snippets"
        badge={
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
            {filtered.length}
          </span>
        }
      >
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-500">
            No matching code snippets to display.
          </p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((item, idx) => (
              <li key={item.id}>
                <Link
                  to={`/code/${item.id}`}
                  onClick={closeSidebar}
                  className="group flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800/80 hover:text-emerald-300"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-[11px] font-medium text-zinc-400 group-hover:bg-emerald-900/80 group-hover:text-emerald-200">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-200 group-hover:text-emerald-300">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Day {item.day.dayNumber}
                      {item.resolvedLanguage
                        ? ` • ${CODE_LANGUAGE_LABELS[item.resolvedLanguage]}`
                        : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </StudentSidebar>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/40 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/50 bg-emerald-950/80 px-3 py-1 text-xs font-medium text-emerald-300">
              <Code2 className="h-3.5 w-3.5" />
              Syntax-Highlighted Library
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
              Code Snippets & Examples
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Full-page code examples with syntax highlighting, line numbers,
              one-click copy, and file downloads.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 font-medium text-zinc-200">
              {items.length} {items.length === 1 ? "Snippet" : "Snippets"}{" "}
              Available
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code snippets, filenames, or languages..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pr-3 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {availableDays.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDay("ALL")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    selectedDay === "ALL"
                      ? "bg-emerald-800 text-emerald-50"
                      : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  All Days
                </button>
                {availableDays.map((dayNum) => (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setSelectedDay(dayNum)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      selectedDay === dayNum
                        ? "bg-emerald-800 text-emerald-50"
                        : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Day {dayNum}
                  </button>
                ))}
              </div>
            )}
          </div>

          {availableLanguages.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-zinc-500">Language:</span>
              <button
                type="button"
                onClick={() => setSelectedLang("ALL")}
                className={`rounded-full px-2.5 py-0.5 text-xs transition ${
                  selectedLang === "ALL"
                    ? "bg-zinc-700 text-zinc-100"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                All
              </button>
              {availableLanguages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLang(lang)}
                  className={`rounded-full px-2.5 py-0.5 text-xs transition ${
                    selectedLang === lang
                      ? "bg-emerald-900/80 text-emerald-200 ring-1 ring-emerald-700"
                      : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {CODE_LANGUAGE_LABELS[lang]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <FileCode2 className="mx-auto h-10 w-10 text-zinc-500" />
          <h2 className="mt-3 text-base font-semibold text-zinc-100">
            No code snippets published yet
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Code examples added to class days will appear here automatically.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-10 text-center text-sm text-zinc-400">
          No code snippets match your current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((item) => {
            const lineCount = item.content
              ? item.content.replace(/\r\n/g, "\n").split("\n").length
              : null;

            return (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 transition hover:border-emerald-700/60 hover:bg-zinc-900"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-emerald-700/60 bg-emerald-900/80 px-2 py-0.5 text-xs font-semibold text-emerald-100">
                      Day {item.day.dayNumber}
                    </span>
                    {item.resolvedLanguage && (
                      <span className="rounded-full border border-emerald-800/60 bg-emerald-950/70 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                        {CODE_LANGUAGE_LABELS[item.resolvedLanguage]}
                      </span>
                    )}
                    {lineCount !== null && (
                      <span className="text-xs text-zinc-500">
                        {lineCount} {lineCount === 1 ? "line" : "lines"}
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/code/${item.id}`}
                    className="mt-3 block text-lg font-bold text-zinc-100 transition group-hover:text-emerald-300"
                  >
                    {item.title}
                  </Link>

                  {item.filename && (
                    <p className="mt-1 font-mono text-xs text-zinc-400">
                      {item.filename}
                    </p>
                  )}

                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-400">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/?day=${item.day.dayNumber}`}
                      className="text-xs font-medium text-zinc-400 transition hover:text-emerald-300"
                    >
                      Day {item.day.dayNumber}
                    </Link>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Source
                      </a>
                    )}
                  </div>

                  <Link
                    to={`/code/${item.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-700"
                  >
                    View Code
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
