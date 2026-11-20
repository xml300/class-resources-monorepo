import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  KeyRound,
  Plus,
  Send,
  Sparkles,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import {
  sendApiRequestInWebContainer,
  type ApiPreviewResponse,
} from "../lib/projectWebContainer";
import type { DetectedApiEndpoint, HttpMethod } from "../lib/apiDetector";

export interface ActiveServerInfo {
  port: number;
  url: string;
}

interface KeyValueRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface RequestHistoryItem {
  id: string;
  method: HttpMethod;
  resolvedPath: string;
  templatePath: string;
  status: number;
  durationMs: number;
  body?: string;
}

interface ApiPreviewPanelProps {
  servers: ActiveServerInfo[];
  selectedPort: number | null;
  onSelectPort: (port: number) => void;
  detectedEndpoints: DetectedApiEndpoint[];
}

const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

const METHOD_BADGE_CLASSES: Record<HttpMethod, string> = {
  GET: "bg-emerald-950/80 text-emerald-300 border-emerald-800/70",
  POST: "bg-sky-950/80 text-sky-300 border-sky-800/70",
  PUT: "bg-amber-950/80 text-amber-300 border-amber-800/70",
  PATCH: "bg-violet-950/80 text-violet-300 border-violet-800/70",
  DELETE: "bg-red-950/80 text-red-300 border-red-800/70",
  HEAD: "bg-zinc-800 text-zinc-300 border-zinc-700",
  OPTIONS: "bg-zinc-800 text-zinc-300 border-zinc-700",
};

const METHOD_TEXT_CLASSES: Record<HttpMethod, string> = {
  GET: "text-emerald-400",
  POST: "text-sky-400",
  PUT: "text-amber-400",
  PATCH: "text-violet-400",
  DELETE: "text-red-400",
  HEAD: "text-zinc-400",
  OPTIONS: "text-zinc-400",
};

function statusBadgeClass(status: number): string {
  if (status >= 200 && status < 300) {
    return "bg-emerald-950/80 text-emerald-300 border-emerald-800/70";
  }
  if (status >= 300 && status < 400) {
    return "bg-sky-950/80 text-sky-300 border-sky-800/70";
  }
  if (status >= 400 && status < 500) {
    return "bg-amber-950/80 text-amber-300 border-amber-800/70";
  }
  return "bg-red-950/80 text-red-300 border-red-800/70";
}

function tryFormatJson(text: string): { formatted: string; isJson: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { formatted: "", isJson: false };
  try {
    const parsed = JSON.parse(trimmed);
    return { formatted: JSON.stringify(parsed, null, 2), isJson: true };
  } catch {
    return { formatted: text, isJson: false };
  }
}

function extractPathParamNames(routePath: string): string[] {
  const names: string[] = [];
  const re = /:([a-zA-Z0-9_]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(routePath)) !== null) {
    if (!names.includes(m[1])) names.push(m[1]);
  }
  return names;
}

function resolvePathWithParamsAndQuery(
  rawPath: string,
  pathParams: Record<string, string>,
  queryRows: KeyValueRow[]
): string {
  let path = rawPath.trim() || "/";
  if (!path.startsWith("/")) path = `/${path}`;

  path = path.replace(/:([a-zA-Z0-9_]+)/g, (_m, name: string) => {
    const val = pathParams[name]?.trim();
    return val ? encodeURIComponent(val) : `:${name}`;
  });

  const activeQuery = queryRows.filter((q) => q.enabled && q.key.trim());
  if (activeQuery.length > 0) {
    const qs = new URLSearchParams();
    for (const q of activeQuery) {
      qs.append(q.key.trim(), q.value);
    }
    const separator = path.includes("?") ? "&" : "?";
    path = `${path}${separator}${qs.toString()}`;
  }

  return path;
}

function HighlightedJson({ json }: { json: string }) {
  const tokens = useMemo(() => {
    const parts: ReactNode[] = [];
    const regex =
      /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = regex.exec(json)) !== null) {
      if (match.index > lastIndex) {
        parts.push(json.slice(lastIndex, match.index));
      }
      const token = match[0];
      let cls = "text-violet-300"; // number
      if (token.startsWith('"')) {
        cls = token.endsWith(":") ? "text-sky-300" : "text-amber-200";
      } else if (token === "true" || token === "false") {
        cls = "text-rose-300";
      } else if (token === "null") {
        cls = "text-zinc-500";
      }
      parts.push(
        <span key={idx++} className={cls}>
          {token}
        </span>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < json.length) {
      parts.push(json.slice(lastIndex));
    }
    return parts;
  }, [json]);

  return (
    <pre className="whitespace-pre-wrap break-words text-zinc-300">
      {tokens}
    </pre>
  );
}

export function ApiPreviewPanel({
  servers,
  selectedPort,
  onSelectPort,
  detectedEndpoints,
}: ApiPreviewPanelProps) {
  const initialEndpoint = detectedEndpoints[0];
  const [method, setMethod] = useState<HttpMethod>(
    initialEndpoint?.method ?? "GET"
  );
  const [path, setPath] = useState<string>(initialEndpoint?.path ?? "/");
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<KeyValueRow[]>([]);
  const [requestTab, setRequestTab] = useState<
    "params" | "body" | "headers" | "auth"
  >("body");
  const [responseTab, setResponseTab] = useState<"body" | "headers">("body");
  const [prettyResponse, setPrettyResponse] = useState(true);
  const [requestBody, setRequestBody] = useState<string>(
    initialEndpoint?.sampleBody ?? '{\n  "title": "Hello from API Explorer"\n}'
  );
  const [bearerToken, setBearerToken] = useState("");
  const [headers, setHeaders] = useState<KeyValueRow[]>([
    {
      id: "h-content-type",
      key: "Content-Type",
      value: "application/json",
      enabled: true,
    },
    {
      id: "h-accept",
      key: "Accept",
      value: "application/json",
      enabled: true,
    },
  ]);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ApiPreviewResponse | null>(null);
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const activeServer = useMemo(
    () =>
      servers.find((s) => s.port === selectedPort) ?? servers[0] ?? null,
    [servers, selectedPort]
  );

  const supportsBody = method !== "GET" && method !== "HEAD";
  const pathParamNames = useMemo(() => extractPathParamNames(path), [path]);

  const resolvedPath = useMemo(
    () => resolvePathWithParamsAndQuery(path, pathParams, queryParams),
    [path, pathParams, queryParams]
  );

  const externalUrl = useMemo(() => {
    if (!activeServer) return null;
    return `${activeServer.url.replace(/\/+$/, "")}${resolvedPath}`;
  }, [activeServer, resolvedPath]);

  const formattedResponse = useMemo(() => {
    if (!response) return { formatted: "", isJson: false };
    return tryFormatJson(response.body);
  }, [response]);

  const buildActiveHeaders = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const h of headers) {
      if (h.enabled && h.key.trim()) {
        if (!supportsBody && h.key.trim().toLowerCase() === "content-type") {
          continue;
        }
        out[h.key.trim()] = h.value;
      }
    }
    if (bearerToken.trim()) {
      out["Authorization"] = bearerToken.trim().startsWith("Bearer ")
        ? bearerToken.trim()
        : `Bearer ${bearerToken.trim()}`;
    }
    return out;
  };

  const handleSelectEndpoint = (ep: DetectedApiEndpoint) => {
    setMethod(ep.method);
    setPath(ep.path);
    if (ep.sampleBody) {
      setRequestBody(ep.sampleBody);
    }
    if (ep.pathParams.length > 0) {
      setRequestTab("params");
    } else if (
      ep.method === "POST" ||
      ep.method === "PUT" ||
      ep.method === "PATCH"
    ) {
      setRequestTab("body");
    }
  };

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!activeServer) return;

    setSending(true);
    setError(null);

    const activeHeaders = buildActiveHeaders();

    try {
      const res = await sendApiRequestInWebContainer({
        port: activeServer.port,
        method,
        path: resolvedPath,
        headers: activeHeaders,
        body: supportsBody ? requestBody : undefined,
      });
      setResponse(res);
      setHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          method,
          resolvedPath,
          templatePath: path,
          status: res.status,
          durationMs: res.durationMs,
          body: supportsBody ? requestBody : undefined,
        },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send API request"
      );
    } finally {
      setSending(false);
    }
  };

  const handleCopyCurl = async () => {
    if (!activeServer) return;
    const url = `http://localhost:${activeServer.port}${resolvedPath}`;
    const activeHeaders = buildActiveHeaders();
    const parts = [`curl -X ${method} "${url}"`];
    for (const [k, v] of Object.entries(activeHeaders)) {
      parts.push(`-H "${k}: ${v.replace(/"/g, '\\"')}"`);
    }
    if (supportsBody && requestBody.trim()) {
      parts.push(`-d '${requestBody.replace(/'/g, "'\\''")}'`);
    }
    await navigator.clipboard.writeText(parts.join(" \\\n  "));
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 1800);
  };

  const handleCopyResponse = async () => {
    if (!response) return;
    const text =
      prettyResponse && formattedResponse.isJson
        ? formattedResponse.formatted
        : response.body;
    await navigator.clipboard.writeText(text);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 1800);
  };

  const handleFormatRequestJson = () => {
    const { formatted, isJson } = tryFormatJson(requestBody);
    if (isJson) setRequestBody(formatted);
  };

  const addRow = (setter: React.Dispatch<React.SetStateAction<KeyValueRow[]>>) => {
    setter((prev) => [
      ...prev,
      {
        id: `kv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        key: "",
        value: "",
        enabled: true,
      },
    ]);
  };

  if (!activeServer) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-xs text-zinc-500">
        <Zap className="mb-2 h-6 w-6 text-zinc-600" />
        <p className="font-medium text-zinc-300">No API server running yet.</p>
        <p className="mt-1 max-w-md text-zinc-500">
          Click <span className="text-emerald-400">Run in Browser</span> to start
          your Express, Fastify, Hono, or Node HTTP server. Once it listens on a
          port, you can explore endpoints, pass path/query params, attach Bearer
          tokens, send JSON bodies, and inspect syntax-highlighted responses.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 divide-y divide-zinc-800 ${
        detectedEndpoints.length > 0
          ? "xl:grid-cols-[240px_1fr] xl:divide-x xl:divide-y-0"
          : ""
      }`}
    >
      {/* Left: Auto-discovered API Endpoints Sidebar */}
      {detectedEndpoints.length > 0 && (
        <div className="flex max-h-[420px] flex-col bg-zinc-900/40 xl:max-h-[520px]">
          <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              Endpoints ({detectedEndpoints.length})
            </span>
          </div>
          <div className="flex-1 divide-y divide-zinc-800/60 overflow-y-auto p-1.5">
            {detectedEndpoints.map((ep) => {
              const isActive = ep.method === method && ep.path === path;
              return (
                <button
                  key={`${ep.method}:${ep.path}`}
                  type="button"
                  onClick={() => handleSelectEndpoint(ep)}
                  title={`Defined in ${ep.sourceFile}`}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-[11px] transition ${
                    isActive
                      ? "bg-emerald-950/70 text-emerald-200 ring-1 ring-inset ring-emerald-800/60"
                      : "text-zinc-300 hover:bg-zinc-800/70"
                  }`}
                >
                  <span
                    className={`w-11 shrink-0 font-bold ${METHOD_TEXT_CLASSES[ep.method]}`}
                  >
                    {ep.method}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{ep.path}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Right: Main API Workbench */}
      <div className="flex min-w-0 flex-col divide-y divide-zinc-800">
        {/* Request URL & Action Bar */}
        <form onSubmit={handleSend} className="space-y-2.5 bg-zinc-900/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="HTTP Method"
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className={`rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold focus:outline-none ${METHOD_BADGE_CLASSES[method]}`}
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m} className="bg-zinc-900 text-zinc-100">
                  {m}
                </option>
              ))}
            </select>

            <div className="flex min-w-[220px] flex-1 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5">
              {servers.length > 1 ? (
                <select
                  aria-label="Server Port"
                  value={activeServer.port}
                  onChange={(e) => onSelectPort(Number(e.target.value))}
                  className="shrink-0 rounded bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300 focus:outline-none"
                >
                  {servers.map((s) => (
                    <option
                      key={s.port}
                      value={s.port}
                      className="bg-zinc-900 text-zinc-100"
                    >
                      :{s.port}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="shrink-0 rounded bg-emerald-950/70 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300">
                  :{activeServer.port}
                </span>
              )}
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/api/health"
                aria-label="API endpoint path"
                className="w-full bg-transparent font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending..." : "Send"}
            </button>

            <button
              type="button"
              onClick={handleCopyCurl}
              title="Copy request as cURL"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
            >
              {copiedCurl ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Copied cURL
                </>
              ) : (
                <>
                  <Terminal className="h-3.5 w-3.5" />
                  cURL
                </>
              )}
            </button>

            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noreferrer"
                title="Open this endpoint in a new browser tab"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-700 hover:text-emerald-300"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                New Tab
              </a>
            )}
          </div>

          {resolvedPath !== path && (
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
              <span className="text-zinc-500">Resolved:</span>
              <span className="truncate text-emerald-300">{resolvedPath}</span>
            </div>
          )}
        </form>

        {/* Request Config + Response Split */}
        <div className="grid grid-cols-1 divide-y divide-zinc-800 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {/* Request Panel */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/50 px-3 py-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRequestTab("params")}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                    requestTab === "params"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Params
                  {pathParamNames.length +
                    queryParams.filter((q) => q.enabled && q.key.trim()).length >
                    0 && (
                    <span className="ml-1 rounded bg-emerald-950 px-1 text-[10px] text-emerald-300">
                      {pathParamNames.length +
                        queryParams.filter((q) => q.enabled && q.key.trim())
                          .length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setRequestTab("body")}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                    requestTab === "body"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Body
                </button>
                <button
                  type="button"
                  onClick={() => setRequestTab("headers")}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                    requestTab === "headers"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Headers ({headers.filter((h) => h.enabled && h.key.trim()).length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestTab("auth")}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                    requestTab === "auth"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <KeyRound className="h-3 w-3" />
                  Auth
                  {bearerToken.trim() && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              </div>

              {requestTab === "body" && supportsBody && (
                <button
                  type="button"
                  onClick={handleFormatRequestJson}
                  className="rounded-md px-2 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  Format JSON
                </button>
              )}
              {requestTab === "headers" && (
                <button
                  type="button"
                  onClick={() => addRow(setHeaders)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-emerald-400 hover:bg-zinc-800"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              )}
              {requestTab === "params" && (
                <button
                  type="button"
                  onClick={() => addRow(setQueryParams)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-emerald-400 hover:bg-zinc-800"
                >
                  <Plus className="h-3 w-3" />
                  Query Param
                </button>
              )}
            </div>

            <div className="h-72 overflow-y-auto p-3">
              {requestTab === "params" ? (
                <div className="space-y-3">
                  {pathParamNames.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                        Path Parameters
                      </p>
                      {pathParamNames.map((name) => (
                        <div key={name} className="flex items-center gap-2">
                          <span className="w-28 shrink-0 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-xs text-emerald-300">
                            :{name}
                          </span>
                          <input
                            type="text"
                            value={pathParams[name] ?? ""}
                            onChange={(e) =>
                              setPathParams((prev) => ({
                                ...prev,
                                [name]: e.target.value,
                              }))
                            }
                            placeholder={`Value for ${name} (e.g. 1)`}
                            className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                      Query Parameters
                    </p>
                    {queryParams.length === 0 ? (
                      <p className="text-xs text-zinc-500">
                        No query parameters. Click{" "}
                        <button
                          type="button"
                          onClick={() => addRow(setQueryParams)}
                          className="text-emerald-400 hover:underline"
                        >
                          + Query Param
                        </button>{" "}
                        to add <code>?key=value</code> pairs.
                      </p>
                    ) : (
                      queryParams.map((row) => (
                        <div key={row.id} className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) =>
                              setQueryParams((prev) =>
                                prev.map((q) =>
                                  q.id === row.id
                                    ? { ...q, enabled: e.target.checked }
                                    : q
                                )
                              )
                            }
                            className="h-3.5 w-3.5 accent-emerald-600"
                          />
                          <input
                            type="text"
                            value={row.key}
                            onChange={(e) =>
                              setQueryParams((prev) =>
                                prev.map((q) =>
                                  q.id === row.id
                                    ? { ...q, key: e.target.value }
                                    : q
                                )
                              )
                            }
                            placeholder="key"
                            className="w-2/5 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-200 focus:border-emerald-700 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={row.value}
                            onChange={(e) =>
                              setQueryParams((prev) =>
                                prev.map((q) =>
                                  q.id === row.id
                                    ? { ...q, value: e.target.value }
                                    : q
                                )
                              )
                            }
                            placeholder="value"
                            className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-200 focus:border-emerald-700 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setQueryParams((prev) =>
                                prev.filter((q) => q.id !== row.id)
                              )
                            }
                            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : requestTab === "body" ? (
                supportsBody ? (
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    rows={11}
                    spellCheck={false}
                    placeholder='{"key": "value"}'
                    className="h-full w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-xs text-zinc-500">
                    {method} requests do not include a request body. Switch to
                    POST, PUT, PATCH, or DELETE to send JSON.
                  </div>
                )
              ) : requestTab === "auth" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300">
                      Bearer Token
                    </label>
                    <input
                      type="text"
                      value={bearerToken}
                      onChange={(e) => setBearerToken(e.target.value)}
                      placeholder="Paste JWT or API token..."
                      className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none"
                    />
                    <p className="mt-1.5 text-[11px] text-zinc-500">
                      Automatically attaches{" "}
                      <code>Authorization: Bearer &lt;token&gt;</code> to every
                      request.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {headers.map((row) => (
                    <div key={row.id} className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) =>
                          setHeaders((prev) =>
                            prev.map((h) =>
                              h.id === row.id
                                ? { ...h, enabled: e.target.checked }
                                : h
                            )
                          )
                        }
                        className="h-3.5 w-3.5 accent-emerald-600"
                      />
                      <input
                        type="text"
                        value={row.key}
                        onChange={(e) =>
                          setHeaders((prev) =>
                            prev.map((h) =>
                              h.id === row.id
                                ? { ...h, key: e.target.value }
                                : h
                            )
                          )
                        }
                        placeholder="Header name"
                        className="w-2/5 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-200 focus:border-emerald-700 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={row.value}
                        onChange={(e) =>
                          setHeaders((prev) =>
                            prev.map((h) =>
                              h.id === row.id
                                ? { ...h, value: e.target.value }
                                : h
                            )
                          )
                        }
                        placeholder="Value"
                        className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-200 focus:border-emerald-700 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setHeaders((prev) =>
                            prev.filter((h) => h.id !== row.id)
                          )
                        }
                        className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Response Viewer */}
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/50 px-3 py-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setResponseTab("body")}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                    responseTab === "body"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Response
                </button>
                <button
                  type="button"
                  onClick={() => setResponseTab("headers")}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                    responseTab === "headers"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Headers
                  {response
                    ? ` (${Object.keys(response.headers).length})`
                    : ""}
                </button>
              </div>

              {response && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono font-semibold ${statusBadgeClass(response.status)}`}
                  >
                    {response.status} {response.statusText}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-zinc-400">
                    <Clock className="h-3 w-3" />
                    {response.durationMs}ms
                  </span>
                  <span className="font-mono text-zinc-500">
                    {response.sizeBytes} B
                  </span>
                  {responseTab === "body" && formattedResponse.isJson && (
                    <button
                      type="button"
                      onClick={() => setPrettyResponse((p) => !p)}
                      className="rounded px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    >
                      {prettyResponse ? "Raw" : "Pretty"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyResponse}
                    title="Copy response"
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    {copiedResponse ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="h-72 overflow-y-auto p-3 font-mono text-xs">
              {error ? (
                <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-red-300">
                  {error}
                </div>
              ) : !response ? (
                <div className="flex h-full items-center justify-center font-sans text-xs text-zinc-500">
                  Pick an endpoint or enter a path, then click Send to inspect
                  the response.
                </div>
              ) : responseTab === "body" ? (
                prettyResponse && formattedResponse.isJson ? (
                  <HighlightedJson json={formattedResponse.formatted} />
                ) : (
                  <pre className="whitespace-pre-wrap break-words text-zinc-200">
                    {response.body || "(empty response body)"}
                  </pre>
                )
              ) : (
                <div className="space-y-1">
                  {Object.entries(response.headers).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex gap-2 border-b border-zinc-900 py-1"
                    >
                      <span className="shrink-0 font-semibold text-emerald-400">
                        {k}:
                      </span>
                      <span className="break-all text-zinc-300">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Request History */}
        {history.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/30 px-3 py-2">
            <span className="text-[11px] font-medium text-zinc-500">
              Recent:
            </span>
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMethod(item.method);
                  setPath(item.templatePath);
                  if (item.body !== undefined) setRequestBody(item.body);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[11px] text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
              >
                <span className={`font-semibold ${METHOD_TEXT_CLASSES[item.method]}`}>
                  {item.method}
                </span>
                <span className="max-w-[160px] truncate text-zinc-400">
                  {item.resolvedPath}
                </span>
                <span
                  className={
                    item.status >= 200 && item.status < 300
                      ? "text-emerald-400"
                      : item.status >= 400
                        ? "text-amber-400"
                        : "text-zinc-400"
                  }
                >
                  {item.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
