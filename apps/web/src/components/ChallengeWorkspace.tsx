import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Eye,
  FileCode2,
  FlaskConical,
  FolderOpen,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  XCircle,
} from "lucide-react";
import { parseChallengeFromMarkdown } from "../lib/challengeParser";
import {
  isWebContainerSupported,
  runChallengeInWebContainer,
  warmWebContainer,
  type ExecutionResult,
  type RunnerStatus,
} from "../lib/webcontainerRunner";
import { CodeBlock } from "./CodeBlock";
import { CodeMirrorEditor } from "./CodeMirrorEditor";
import { MarkdownContent } from "./MarkdownContent";

interface ChallengeWorkspaceProps {
  resourceId: string;
  sectionId: string;
  title: string;
  markdown: string;
  isCompleted: boolean;
  onPassed: () => void;
}

type LeftTab = "instructions" | "tests" | "files" | "solution";

function getDraftStorageKey(resourceId: string, sectionId: string): string {
  return `challenge-draft:${resourceId}:${sectionId}`;
}

function readDraft(resourceId: string, sectionId: string): string | null {
  try {
    return localStorage.getItem(getDraftStorageKey(resourceId, sectionId));
  } catch {
    return null;
  }
}

function writeDraft(resourceId: string, sectionId: string, code: string): void {
  try {
    localStorage.setItem(getDraftStorageKey(resourceId, sectionId), code);
  } catch {
    // ignore storage errors
  }
}

function clearDraft(resourceId: string, sectionId: string): void {
  try {
    localStorage.removeItem(getDraftStorageKey(resourceId, sectionId));
  } catch {
    // ignore storage errors
  }
}

export function ChallengeWorkspace({
  resourceId,
  sectionId,
  title,
  markdown,
  isCompleted,
  onPassed,
}: ChallengeWorkspaceProps) {
  const parsed = useMemo(
    () => parseChallengeFromMarkdown(markdown, title),
    [markdown, title]
  );

  const [code, setCode] = useState<string>(
    () => readDraft(resourceId, sectionId) ?? parsed.starterCode
  );
  const [cliArgs, setCliArgs] = useState<string>(parsed.defaultArgs);
  const [showArgsInput, setShowArgsInput] = useState<boolean>(
    Boolean(parsed.defaultArgs)
  );
  const [leftTab, setLeftTab] = useState<LeftTab>("instructions");
  const [solutionRevealed, setSolutionRevealed] = useState<boolean>(false);
  const [runnerStatus, setRunnerStatus] = useState<RunnerStatus>("idle");
  const [streamingOutput, setStreamingOutput] = useState<string>("");
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [outputView, setOutputView] = useState<"results" | "console">("results");

  const wcSupport = useMemo(() => isWebContainerSupported(), []);

  // Pre-warm WebContainer + hot Node.js worker in the background on mount
  useEffect(() => {
    if (wcSupport.supported) {
      warmWebContainer(setRunnerStatus);
    }
  }, [wcSupport.supported]);

  // Reset local editor & result state whenever the active challenge changes
  useEffect(() => {
    const saved = readDraft(resourceId, sectionId);
    setCode(saved ?? parsed.starterCode);
    setCliArgs(parsed.defaultArgs);
    setShowArgsInput(Boolean(parsed.defaultArgs));
    setLeftTab("instructions");
    setSolutionRevealed(false);
    setResult(null);
    setStreamingOutput("");
    setOutputView("results");
  }, [resourceId, sectionId, parsed.starterCode, parsed.defaultArgs]);

  const handleCodeChange = useCallback(
    (next: string) => {
      setCode(next);
      writeDraft(resourceId, sectionId, next);
    },
    [resourceId, sectionId]
  );

  const handleResetCode = () => {
    clearDraft(resourceId, sectionId);
    setCode(parsed.starterCode);
    setResult(null);
    setStreamingOutput("");
  };

  const hasTests = Boolean(parsed.sampleTests || parsed.attemptTests);
  const isBusy =
    runnerStatus === "booting" ||
    runnerStatus === "installing" ||
    runnerStatus === "running";

  const execute = useCallback(
    async (mode: "run" | "sample-test" | "attempt") => {
      if (isBusy) return;
      setStreamingOutput("");
      setResult(null);
      if (mode === "run") {
        setOutputView("console");
      } else {
        setOutputView("results");
      }

      const testCode =
        mode === "attempt"
          ? parsed.attemptTests ?? parsed.sampleTests
          : mode === "sample-test"
            ? parsed.sampleTests ?? parsed.attemptTests
            : null;

      const execResult = await runChallengeInWebContainer({
        mode,
        entryFilename: parsed.entryFilename,
        code,
        testCode,
        files: parsed.files,
        cliArgs,
        onStatus: setRunnerStatus,
        onOutputChunk: (chunk) => {
          setStreamingOutput((prev) => prev + chunk);
        },
      });

      setResult(execResult);

      if (mode === "attempt" && execResult.passed) {
        onPassed();
      }
    },
    [
      isBusy,
      parsed.attemptTests,
      parsed.sampleTests,
      parsed.entryFilename,
      parsed.files,
      code,
      cliArgs,
      onPassed,
    ]
  );

  const handlePrimaryShortcut = useCallback(() => {
    if (parsed.sampleTests) {
      void execute("sample-test");
    } else if (parsed.attemptTests) {
      void execute("attempt");
    } else {
      void execute("run");
    }
  }, [execute, parsed.sampleTests, parsed.attemptTests]);

  const statusLabel =
    runnerStatus === "booting"
      ? "Booting Node.js..."
      : runnerStatus === "installing"
        ? "Installing packages..."
        : runnerStatus === "running"
          ? "Running..."
          : runnerStatus === "ready"
            ? "Node.js Ready"
            : runnerStatus === "error"
              ? "Runtime Error"
              : "Node.js Sandbox";

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* LEFT PANE: Prompt, Sample Tests, Files, Solution */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 xl:col-span-5 xl:max-h-[760px]">
        {/* Left Tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800 bg-zinc-900/70 px-3 py-2">
          <button
            type="button"
            onClick={() => setLeftTab("instructions")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              leftTab === "instructions"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
            Instructions
          </button>

          {parsed.sampleTests && (
            <button
              type="button"
              onClick={() => setLeftTab("tests")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                leftTab === "tests"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5 text-sky-400" />
              Sample Tests
            </button>
          )}

          {parsed.files.length > 0 && (
            <button
              type="button"
              onClick={() => setLeftTab("files")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                leftTab === "files"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
              Files ({parsed.files.length})
            </button>
          )}

          {parsed.solutionCode && (
            <button
              type="button"
              onClick={() => setLeftTab("solution")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                leftTab === "solution"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              Solution
            </button>
          )}
        </div>

        {/* Left Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {leftTab === "instructions" && (
            <MarkdownContent content={parsed.promptMarkdown} />
          )}

          {leftTab === "tests" && parsed.sampleTests && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-400">
                Executed with <code className="font-mono text-zinc-300">node --test</code> against{" "}
                <code className="font-mono text-emerald-300">./{parsed.entryFilename}</code>.
              </p>
              <CodeBlock
                code={parsed.sampleTests}
                language={parsed.language}
                filename="sample.test.mjs"
              />
            </div>
          )}

          {leftTab === "files" && parsed.files.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                Mounted in the WebContainer working directory for{" "}
                <code className="font-mono text-zinc-300">node:fs</code> /{" "}
                <code className="font-mono text-zinc-300">import</code> access:
              </p>
              {parsed.files.map((file) => (
                <div key={file.path}>
                  <CodeBlock
                    code={file.content}
                    filename={file.path}
                    language={
                      file.path.endsWith(".json")
                        ? "json"
                        : file.path.endsWith(".ts")
                          ? "typescript"
                          : file.path.endsWith(".js") || file.path.endsWith(".mjs")
                            ? "javascript"
                            : "plaintext"
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {leftTab === "solution" && parsed.solutionCode && (
            <div>
              {isCompleted || solutionRevealed ? (
                <CodeBlock
                  code={parsed.solutionCode}
                  language={parsed.language}
                  filename={parsed.entryFilename}
                />
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-purple-400" />
                  <h3 className="mt-2.5 text-sm font-semibold text-zinc-100">
                    Reference Solution Hidden
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    Pass all tests with Attempt to unlock automatically, or reveal it now if you're stuck.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSolutionRevealed(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-purple-700/60 bg-purple-950/60 px-3.5 py-1.5 text-xs font-medium text-purple-200 transition hover:bg-purple-900/70"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Reveal Solution
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: CodeMirror Editor + Runner Toolbar + Output */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 xl:col-span-7 xl:max-h-[760px]">
        {/* Editor Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/80 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-950 px-2.5 py-1 font-mono text-xs text-zinc-200">
              <FileCode2 className="h-3.5 w-3.5 text-emerald-400" />
              {parsed.entryFilename}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                runnerStatus === "ready"
                  ? "bg-emerald-950/80 text-emerald-300"
                  : runnerStatus === "error"
                    ? "bg-red-950/80 text-red-300"
                    : isBusy
                      ? "bg-amber-950/80 text-amber-300"
                      : "bg-zinc-800/80 text-zinc-400"
              }`}
            >
              {isBusy && <Loader2 className="h-3 w-3 animate-spin" />}
              {statusLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowArgsInput((prev) => !prev)}
              title="Toggle CLI arguments (process.argv)"
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition ${
                showArgsInput || cliArgs
                  ? "border-emerald-700/60 bg-emerald-950/50 text-emerald-300"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Terminal className="h-3 w-3" />
              Args
            </button>

            <button
              type="button"
              onClick={handleResetCode}
              disabled={isBusy}
              title="Reset editor to starter code"
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>

            <button
              type="button"
              onClick={() => void execute("run")}
              disabled={isBusy || !wcSupport.supported}
              title="Run with node (Ctrl/Cmd + Enter when no tests)"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 text-emerald-400" />
              Run
            </button>

            {parsed.sampleTests && (
              <button
                type="button"
                onClick={() => void execute("sample-test")}
                disabled={isBusy || !wcSupport.supported}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-700/70 bg-sky-950/80 px-2.5 py-1 text-xs font-semibold text-sky-200 transition hover:bg-sky-900/80 disabled:opacity-50"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                Test
              </button>
            )}

            {hasTests && (
              <button
                type="button"
                onClick={() => void execute("attempt")}
                disabled={isBusy || !wcSupport.supported}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-600 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Attempt
              </button>
            )}
          </div>
        </div>

        {/* Optional CLI Args Row */}
        {showArgsInput && (
          <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/50 px-3 py-1.5">
            <span className="shrink-0 font-mono text-[11px] text-zinc-400">
              $ node {parsed.entryFilename}
            </span>
            <input
              type="text"
              value={cliArgs}
              onChange={(e) => setCliArgs(e.target.value)}
              placeholder='Optional CLI args, e.g. add "Buy milk"'
              className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none"
            />
          </div>
        )}

        {/* Unsupported browser / COOP-COEP warning */}
        {!wcSupport.supported && (
          <div className="flex items-start gap-2 border-b border-amber-800/60 bg-amber-950/50 px-3 py-2 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>{wcSupport.reason}</span>
          </div>
        )}

        {/* CodeMirror Editor */}
        <div className="min-h-[280px] flex-1 overflow-auto">
          <CodeMirrorEditor
            value={code}
            onChange={handleCodeChange}
            language={parsed.language}
            onRun={handlePrimaryShortcut}
            className="h-full min-h-[280px]"
          />
        </div>

        {/* Bottom Output / Test Results Panel */}
        <div className="flex max-h-[260px] min-h-[170px] flex-col border-t border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              {hasTests && (
                <button
                  type="button"
                  onClick={() => setOutputView("results")}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                    outputView === "results"
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Test Results
                </button>
              )}
              <button
                type="button"
                onClick={() => setOutputView("console")}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                  outputView === "console" || !hasTests
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Console Output
              </button>
            </div>

            {result && (
              <div className="flex items-center gap-2 text-xs">
                {result.mode !== "run" && result.tests.length > 0 ? (
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      result.passed ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {result.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {result.passedCount}/{result.tests.length} passed
                  </span>
                ) : (
                  <span
                    className={`font-medium ${
                      result.passed ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    Exit {result.exitCode}
                  </span>
                )}
                <span className="text-zinc-500 tabular-nums">
                  {result.durationMs}ms
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
            {isBusy ? (
              <div className="space-y-2 text-zinc-400">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  <span>{statusLabel}</span>
                </div>
                {streamingOutput && (
                  <pre className="whitespace-pre-wrap text-zinc-300">
                    {streamingOutput}
                  </pre>
                )}
              </div>
            ) : !result ? (
              <p className="text-zinc-500">
                Click <span className="text-zinc-300">Run</span>
                {hasTests ? (
                  <>
                    , <span className="text-sky-300">Test</span>, or{" "}
                    <span className="text-emerald-300">Attempt</span>
                  </>
                ) : null}{" "}
                (or press <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-[10px] text-zinc-300">Ctrl/Cmd + Enter</kbd>) to execute in full Node.js.
              </p>
            ) : outputView === "results" && hasTests && result.mode !== "run" ? (
              <div className="space-y-2">
                {result.error && (
                  <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-2.5 text-red-300 whitespace-pre-wrap">
                    {result.error}
                  </div>
                )}

                {result.mode === "attempt" && result.passed && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 font-sans text-xs font-medium text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    All tests passed! Exercise marked as complete.
                  </div>
                )}

                {result.tests.length > 0 && (
                  <ul className="space-y-1.5">
                    {result.tests.map((tc, idx) => (
                      <li
                        key={`${tc.name}-${idx}`}
                        className={`rounded-lg border px-2.5 py-1.5 ${
                          tc.passed
                            ? "border-emerald-900/50 bg-emerald-950/20 text-emerald-200"
                            : "border-red-900/60 bg-red-950/30 text-red-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5">
                            {tc.passed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                            )}
                            <span>{tc.name}</span>
                          </span>
                          {tc.durationMs !== undefined && (
                            <span className="text-[10px] text-zinc-500">
                              {tc.durationMs}ms
                            </span>
                          )}
                        </div>
                        {tc.error && (
                          <pre className="mt-1.5 overflow-x-auto border-t border-red-900/40 pt-1.5 text-[11px] text-red-300 whitespace-pre-wrap">
                            {tc.error}
                          </pre>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {result.error && (
                  <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-2 text-red-300">
                    {result.error}
                  </div>
                )}
                {result.stdout ? (
                  <pre className="whitespace-pre-wrap text-zinc-200">
                    {result.stdout}
                  </pre>
                ) : (
                  <p className="text-zinc-500 italic">
                    (No output written to stdout/stderr)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
