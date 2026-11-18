import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Hash,
  WrapText,
} from "lucide-react";
import {
  CODE_LANGUAGE_LABELS,
  inferCodeLanguage,
  type CodeLanguage,
} from "@repo/shared";
import {
  highlightCodeToTokens,
  type HighlightedLines,
} from "../lib/highlighter";

const LANGUAGE_EXTENSIONS: Record<CodeLanguage, string> = {
  typescript: "ts",
  javascript: "js",
  tsx: "tsx",
  jsx: "jsx",
  bash: "sh",
  json: "json",
  sql: "sql",
  dockerfile: "Dockerfile",
  html: "html",
  css: "css",
  yaml: "yml",
  markdown: "md",
  python: "py",
  diff: "diff",
  plaintext: "txt",
};

export interface CodeBlockProps {
  code: string;
  language?: string | null;
  filename?: string | null;
  title?: string | null;
  defaultShowLineNumbers?: boolean;
  allowDownload?: boolean;
  compact?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  filename,
  title,
  defaultShowLineNumbers = false,
  allowDownload = false,
  compact = false,
  className = "",
}: CodeBlockProps) {
  const normalizedLang = useMemo(
    () => inferCodeLanguage(filename, language),
    [filename, language]
  );
  const [tokens, setTokens] = useState<HighlightedLines | null>(null);
  const [showLineNumbers, setShowLineNumbers] = useState(
    defaultShowLineNumbers
  );
  const [wrapLines, setWrapLines] = useState(false);
  const [copied, setCopied] = useState(false);

  const normalizedCode = useMemo(
    () => code.replace(/\r\n/g, "\n").replace(/\n$/, ""),
    [code]
  );
  const rawLines = useMemo(
    () => normalizedCode.split("\n"),
    [normalizedCode]
  );

  useEffect(() => {
    let active = true;
    setTokens(null);

    if (!normalizedLang || normalizedLang === "plaintext") {
      return;
    }

    highlightCodeToTokens(normalizedCode, normalizedLang).then((result) => {
      if (active) {
        setTokens(result);
      }
    });

    return () => {
      active = false;
    };
  }, [normalizedCode, normalizedLang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(normalizedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors in unsupported contexts
    }
  };

  const handleDownload = () => {
    const ext = normalizedLang ? LANGUAGE_EXTENSIONS[normalizedLang] : "txt";
    const slug = (title || "snippet")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const downloadName =
      filename ||
      (ext === "Dockerfile" ? "Dockerfile" : `${slug || "snippet"}.${ext}`);

    const blob = new Blob([normalizedCode + "\n"], {
      type: "text/plain;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const displayLang = normalizedLang
    ? CODE_LANGUAGE_LABELS[normalizedLang]
    : language?.trim() || "Code";

  const lineCount = rawLines.length;
  const lineNumberWidth =
    lineCount >= 1000 ? "w-11" : lineCount >= 100 ? "w-9" : "w-7";

  return (
    <div
      className={`overflow-hidden rounded-xl border border-zinc-800 bg-[#0d1117] shadow-xs ${className}`}
    >
      {/* Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/90 bg-zinc-900/90 px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {filename && (
            <span className="truncate font-mono text-xs font-medium text-zinc-200">
              {filename}
            </span>
          )}
          <span className="rounded-md border border-zinc-700/80 bg-zinc-950/80 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-300 uppercase">
            {displayLang}
          </span>
          {!compact && (
            <span className="text-[11px] text-zinc-500">
              {lineCount} {lineCount === 1 ? "line" : "lines"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!compact && (
            <>
              <button
                type="button"
                onClick={() => setShowLineNumbers((prev) => !prev)}
                title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                  showLineNumbers
                    ? "border-emerald-700/70 bg-emerald-950/60 text-emerald-300"
                    : "border-zinc-700/80 bg-zinc-950/70 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Hash className="h-3 w-3" />
                <span className="hidden sm:inline">Lines</span>
              </button>
              <button
                type="button"
                onClick={() => setWrapLines((prev) => !prev)}
                title={wrapLines ? "Disable word wrap" : "Enable word wrap"}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                  wrapLines
                    ? "border-emerald-700/70 bg-emerald-950/60 text-emerald-300"
                    : "border-zinc-700/80 bg-zinc-950/70 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <WrapText className="h-3 w-3" />
                <span className="hidden sm:inline">Wrap</span>
              </button>
            </>
          )}

          {allowDownload && (
            <button
              type="button"
              onClick={handleDownload}
              title="Download file"
              className="inline-flex items-center gap-1 rounded-md border border-zinc-700/80 bg-zinc-950/70 px-2 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-700/80 bg-zinc-950/70 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <div className="overflow-x-auto py-3.5">
        <pre
          className={`font-mono text-xs leading-relaxed sm:text-[13px] ${
            wrapLines ? "whitespace-pre-wrap break-words" : "whitespace-pre"
          }`}
        >
          <code className="block min-w-full">
            {tokens
              ? tokens.map((line, lineIdx) => (
                  <div
                    key={lineIdx}
                    className="flex px-4 hover:bg-zinc-800/35"
                  >
                    {showLineNumbers && (
                      <span
                        aria-hidden="true"
                        className={`mr-4 inline-block shrink-0 select-none text-right text-zinc-600 ${lineNumberWidth}`}
                      >
                        {lineIdx + 1}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      {line.length === 0 ? (
                        "\n"
                      ) : (
                        line.map((token, tokenIdx) => (
                          <span
                            key={tokenIdx}
                            style={{
                              color: token.color,
                              fontStyle:
                                token.fontStyle && token.fontStyle & 1
                                  ? "italic"
                                  : undefined,
                              fontWeight:
                                token.fontStyle && token.fontStyle & 2
                                  ? 600
                                  : undefined,
                              textDecoration:
                                token.fontStyle && token.fontStyle & 4
                                  ? "underline"
                                  : undefined,
                            }}
                          >
                            {token.content}
                          </span>
                        ))
                      )}
                    </span>
                  </div>
                ))
              : rawLines.map((line, lineIdx) => (
                  <div
                    key={lineIdx}
                    className="flex px-4 text-zinc-200 hover:bg-zinc-800/35"
                  >
                    {showLineNumbers && (
                      <span
                        aria-hidden="true"
                        className={`mr-4 inline-block shrink-0 select-none text-right text-zinc-600 ${lineNumberWidth}`}
                      >
                        {lineIdx + 1}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      {line.length === 0 ? "\n" : line}
                    </span>
                  </div>
                ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
