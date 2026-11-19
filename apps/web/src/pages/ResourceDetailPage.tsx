import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  RefreshCw,
} from "lucide-react";
import type { ResourceWithDayDTO } from "@repo/shared";
import { api } from "../lib/api";
import { useDays } from "../context/DaysContext";
import { ResourceBadge } from "../components/ResourceBadge";
import { MarkdownContent } from "../components/MarkdownContent";
import { StudentSidebar, useStudentSidebar } from "../layouts/StudentLayout";

function isMarkdownUrl(url: string | null): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  return clean.endsWith(".md") || clean.endsWith(".markdown");
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function extractTocHeadings(markdown: string): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];
  let inFence = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (match) {
      const text = match[2].replace(/[`*_~]/g, "").trim();
      headings.push({
        id: slugifyHeading(text),
        text,
        level: match[1].length,
      });
    }
  }
  return headings;
}

export function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { closeSidebar } = useStudentSidebar();
  const { syncActiveDayNumber } = useDays();
  const [resource, setResource] = useState<ResourceWithDayDTO | null>(null);
  const [fetchedMarkdown, setFetchedMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setFetchedMarkdown(null);
        const data = await api.getPublicResource(id);
        if (!active) return;
        setResource(data);
        syncActiveDayNumber(data.day.dayNumber);

        if (!data.content && data.url && isMarkdownUrl(data.url)) {
          const res = await fetch(data.url, { cache: "no-store" });
          if (res.ok && active) {
            setFetchedMarkdown(await res.text());
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load resource"
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
    if (!resource || refreshing) return;
    setRefreshing(true);
    try {
      await api.refreshResourceMarkdown(resource.dayId, resource.id);
      const updated = await api.getPublicResource(resource.id);
      setResource(updated);
      if (!updated.content && updated.url && isMarkdownUrl(updated.url)) {
        const res = await fetch(updated.url, { cache: "no-store" });
        if (res.ok) {
          setFetchedMarkdown(await res.text());
        }
      }
    } catch {
      // keep existing view on transient refresh failure
    } finally {
      setRefreshing(false);
    }
  };

  const markdownBody = resource?.content ?? fetchedMarkdown ?? "";
  const tocHeadings = useMemo(
    () => (markdownBody ? extractTocHeadings(markdownBody) : []),
    [markdownBody]
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Class Materials
        </Link>
        <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">
          {error || "Resource not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StudentSidebar
        icon={<BookOpen className="h-4 w-4 text-emerald-400" />}
        title="Contents"
        badge={
          tocHeadings.length > 0 ? (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
              {tocHeadings.length}
            </span>
          ) : undefined
        }
      >
        {tocHeadings.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">
            No section headings in this document.
          </p>
        ) : (
          <ul className="space-y-1">
            {tocHeadings.map((h, idx) => (
              <li key={`${h.id}-${idx}`}>
                <a
                  href={`#${h.id}`}
                  onClick={closeSidebar}
                  className={`block truncate rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800/80 hover:text-emerald-300 ${
                    h.level === 3 ? "pl-5 text-zinc-400" : ""
                  }`}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </StudentSidebar>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`/?day=${resource.day.dayNumber}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Day {resource.day.dayNumber} Materials
        </Link>
      </div>

      {/* Metadata Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <ResourceBadge type={resource.type} />
          <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-xs font-medium text-zinc-300">
            <FileText className="h-3 w-3 text-emerald-400" />
            Markdown
          </span>
          <Link
            to={`/?day=${resource.day.dayNumber}`}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-700 hover:text-emerald-300"
          >
            Day {resource.day.dayNumber}: {resource.day.title}
          </Link>
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
          {resource.title}
        </h1>
        {resource.description && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-300">
            {resource.description}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-700 hover:bg-emerald-950/60 hover:text-emerald-200 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Source Document
            </a>
          )}
        </div>
      </div>

      {/* Document Body */}
      <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8">
        {markdownBody ? (
          <MarkdownContent content={markdownBody} />
        ) : (
          <p className="text-sm text-zinc-500 italic">
            No markdown content available.{" "}
            {resource.url ? (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 underline"
              >
                Open external link
              </a>
            ) : null}
          </p>
        )}
      </article>
    </div>
  );
}
