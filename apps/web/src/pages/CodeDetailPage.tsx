import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Code2,
  ExternalLink,
  FileCode2,
  FolderCode,
} from "lucide-react";
import {
  CODE_LANGUAGE_LABELS,
  inferCodeLanguage,
  type ResourceWithDayDTO,
} from "@repo/shared";
import { api } from "../lib/api";
import { useDays } from "../context/DaysContext";
import { CodeBlock } from "../components/CodeBlock";
import { CodeFolderWorkspace } from "../components/CodeFolderWorkspace";
import { StudentSidebar, useStudentSidebar } from "../layouts/StudentLayout";

function isFetchableCodeUrl(url: string | null): boolean {
  if (!url) return false;
  // Support local uploaded files or direct raw code file URLs
  const clean = url.split("?")[0].split("#")[0];
  const isLocalUpload = clean.startsWith("/uploads/");
  const inferred = inferCodeLanguage(clean, null);
  return isLocalUpload || (inferred !== null && inferred !== "markdown");
}

export function CodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { closeSidebar } = useStudentSidebar();
  const { syncActiveDayNumber } = useDays();
  const [resource, setResource] = useState<ResourceWithDayDTO | null>(null);
  const [allCode, setAllCode] = useState<ResourceWithDayDTO[]>([]);
  const [fetchedCode, setFetchedCode] = useState<string | null>(null);
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setFetchedCode(null);
        const detail = await api.getPublicCodeResource(id);
        if (!active) return;
        setResource(detail);
        syncActiveDayNumber(detail.day.dayNumber);
        const list = await api
          .getPublicCodeResources({ dayId: detail.dayId })
          .catch(() => [] as ResourceWithDayDTO[]);
        if (!active) return;
        setAllCode(list);

        if (!detail.content && detail.url && isFetchableCodeUrl(detail.url)) {
          setFetchingRemote(true);
          try {
            const res = await fetch(detail.url, { cache: "no-store" });
            if (res.ok && active) {
              const contentType = res.headers.get("content-type") ?? "";
              if (!contentType.includes("text/html")) {
                setFetchedCode(await res.text());
              }
            }
          } catch {
            // Fall back to external source card
          } finally {
            if (active) setFetchingRemote(false);
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load code resource"
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

  const { prevItem, nextItem } = useMemo(() => {
    if (!resource || allCode.length === 0) {
      return { prevItem: null, nextItem: null };
    }
    const idx = allCode.findIndex((c) => c.id === resource.id);
    if (idx === -1) return { prevItem: null, nextItem: null };
    return {
      prevItem: idx > 0 ? allCode[idx - 1] : null,
      nextItem: idx < allCode.length - 1 ? allCode[idx + 1] : null,
    };
  }, [allCode, resource]);

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
          to="/code"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Code Library
        </Link>
        <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 p-6 text-red-300">
          {error || "Code resource not found"}
        </div>
      </div>
    );
  }

  const folderFiles = resource.files ?? [];
  const isCodeFolder = folderFiles.length > 0;
  const resolvedLanguage = inferCodeLanguage(
    resource.filename || resource.url,
    resource.language
  );
  const codeBody = resource.content ?? fetchedCode;
  const inferredFilename =
    resource.filename ||
    (resource.url?.startsWith("/uploads/")
      ? resource.url.split("/").pop()?.replace(/^\d+-/, "") ?? null
      : null);

  return (
    <div className="space-y-6">
      <StudentSidebar
        icon={<Code2 className="h-4 w-4 text-emerald-400" />}
        title="Code Library"
        badge={
          allCode.length > 0 ? (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
              {allCode.length}
            </span>
          ) : undefined
        }
      >
        {allCode.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">No other snippets.</p>
        ) : (
          <ul className="space-y-1">
            {allCode.map((item) => {
              const isCurrent = item.id === resource.id;
              const lang = inferCodeLanguage(
                item.filename || item.url,
                item.language
              );
              const itemIsFolder = (item.fileCount ?? 0) > 0;
              return (
                <li key={item.id}>
                  <Link
                    to={`/code/${item.id}`}
                    onClick={closeSidebar}
                    className={`flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-sm transition ${
                      isCurrent
                        ? "border border-emerald-800/60 bg-emerald-950/40 text-emerald-200"
                        : "text-zinc-300 hover:bg-zinc-800/80 hover:text-emerald-300"
                    }`}
                  >
                    {itemIsFolder ? (
                      <FolderCode
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          isCurrent ? "text-emerald-400" : "text-zinc-500"
                        }`}
                      />
                    ) : (
                      <FileCode2
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          isCurrent ? "text-emerald-400" : "text-zinc-500"
                        }`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Day {item.day.dayNumber}
                        {itemIsFolder
                          ? ` • ${item.fileCount} files`
                          : lang
                            ? ` • ${CODE_LANGUAGE_LABELS[lang]}`
                            : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </StudentSidebar>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`/code?day=${resource.day.dayNumber}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Day {resource.day.dayNumber} Code Snippets
        </Link>
        <Link
          to={`/?day=${resource.day.dayNumber}`}
          className="text-xs font-medium text-zinc-400 transition hover:text-emerald-300"
        >
          Back to Day {resource.day.dayNumber} Materials
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/70 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
            {isCodeFolder ? (
              <>
                <FolderCode className="h-3.5 w-3.5" />
                Code Folder • {folderFiles.length}{" "}
                {folderFiles.length === 1 ? "file" : "files"}
              </>
            ) : (
              <>
                <Code2 className="h-3.5 w-3.5" />
                {resolvedLanguage
                  ? CODE_LANGUAGE_LABELS[resolvedLanguage]
                  : "Code"}
              </>
            )}
          </span>
          <Link
            to={`/?day=${resource.day.dayNumber}`}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-700 hover:text-emerald-300"
          >
            Day {resource.day.dayNumber}: {resource.day.title}
          </Link>
          {inferredFilename && !isCodeFolder && (
            <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-0.5 font-mono text-xs text-zinc-300">
              {inferredFilename}
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
          {resource.title}
        </h1>
        {resource.description && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-300">
            {resource.description}
          </p>
        )}

        {resource.url && !isCodeFolder && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open External Source
            </a>
          </div>
        )}
      </div>

      {/* Code Viewer */}
      {isCodeFolder ? (
        <CodeFolderWorkspace resource={resource} files={folderFiles} />
      ) : fetchingRemote ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-12 text-sm text-zinc-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          Loading code file...
        </div>
      ) : codeBody ? (
        <CodeBlock
          code={codeBody}
          language={resolvedLanguage ?? resource.language}
          filename={inferredFilename}
          title={resource.title}
          defaultShowLineNumbers
          allowDownload
        />
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center">
          <FileCode2 className="mx-auto h-9 w-9 text-emerald-400" />
          <h2 className="mt-3 text-base font-semibold text-zinc-100">
            Hosted Externally
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            This code resource links to an external repository or file.
          </p>
          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-700"
            >
              <ExternalLink className="h-4 w-4" />
              Open Code Link
            </a>
          )}
        </div>
      )}

      {/* Prev / Next Navigation */}
      {(prevItem || nextItem) && (
        <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
          {prevItem ? (
            <Link
              to={`/code/${prevItem.id}`}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 transition hover:border-emerald-700/60 hover:bg-zinc-900"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 text-zinc-400" />
              <div className="min-w-0">
                <p className="text-[11px] text-zinc-500">Previous</p>
                <p className="truncate text-sm font-medium text-zinc-200">
                  {prevItem.title}
                </p>
              </div>
            </Link>
          ) : (
            <div />
          )}
          {nextItem && (
            <Link
              to={`/code/${nextItem.id}`}
              className="flex items-center justify-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-right transition hover:border-emerald-700/60 hover:bg-zinc-900"
            >
              <div className="min-w-0">
                <p className="text-[11px] text-zinc-500">Next</p>
                <p className="truncate text-sm font-medium text-zinc-200">
                  {nextItem.title}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
