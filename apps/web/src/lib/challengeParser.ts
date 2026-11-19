export interface ChallengeWorkspaceFile {
  path: string;
  content: string;
}

export interface ParsedChallenge {
  /** Cleaned markdown instructions with hidden challenge meta fences removed */
  promptMarkdown: string;
  /** Primary language of the student solution */
  language: "javascript" | "typescript";
  /** Entry filename mounted in WebContainer */
  entryFilename: string;
  /** Starter code preloaded into the student editor */
  starterCode: string;
  /** Whether an explicit `starter` fence was defined in markdown */
  hasExplicitStarter: boolean;
  /** Visible sample test suite (node:test) */
  sampleTests: string | null;
  /** Full attempt test suite (node:test) */
  attemptTests: string | null;
  /** Reference solution code (hidden until unlocked/revealed) */
  solutionCode: string | null;
  /** Additional workspace files (fixtures, package.json, etc.) */
  files: ChallengeWorkspaceFile[];
  /** Optional default CLI arguments for Run mode */
  defaultArgs: string;
}

function sanitizeWorkspacePath(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "");
  if (!cleaned) return null;
  const segments = cleaned.split("/").filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some((seg) => seg === "." || seg === "..")
  ) {
    return null;
  }
  return segments.join("/");
}

function isTypeScriptLang(lang: string): boolean {
  const lower = lang.toLowerCase();
  return lower === "ts" || lower === "typescript" || lower === "mts" || lower === "cts";
}

function buildDefaultStarter(title: string, language: "javascript" | "typescript"): string {
  const header = title ? `// ${title}\n` : "";
  if (language === "typescript") {
    return (
      `${header}// Full Node.js runtime available (fs, path, crypto, stream, http, etc.)\n` +
      `// Press Ctrl/Cmd + Enter to run.\n\n` +
      `export function solve(input: unknown) {\n` +
      `  return input;\n` +
      `}\n\n` +
      `console.log("Ready!");\n`
    );
  }
  return (
    `${header}// Full Node.js runtime available (fs, path, crypto, stream, http, etc.)\n` +
    `// Press Ctrl/Cmd + Enter to run.\n\n` +
    `console.log("Hello from Node.js", process.version);\n`
  );
}

interface FenceMeta {
  lang: string;
  role: "starter" | "sample-test" | "attempt-test" | "solution" | "file" | null;
  filePath: string | null;
  args: string | null;
}

function parseFenceInfo(infoString: string): FenceMeta {
  const trimmed = infoString.trim();
  if (!trimmed) {
    return { lang: "", role: null, filePath: null, args: null };
  }

  // Tokenize respecting quoted values like args="foo bar" or file="data/a b.txt"
  const tokens: string[] = [];
  let current = "";
  let i = 0;

  while (i < trimmed.length) {
    while (i < trimmed.length && /\s/.test(trimmed[i])) i++;
    if (i >= trimmed.length) break;
    current = "";
    while (i < trimmed.length && !/\s/.test(trimmed[i])) {
      if (trimmed[i] === '"' || trimmed[i] === "'") {
        const quote = trimmed[i++];
        while (i < trimmed.length && trimmed[i] !== quote) {
          current += trimmed[i++];
        }
        if (i < trimmed.length) i++;
      } else {
        current += trimmed[i++];
      }
    }
    if (current) tokens.push(current);
  }

  const lang = (tokens[0] ?? "").toLowerCase();
  const rest = tokens.slice(1);

  let role: FenceMeta["role"] = null;
  let filePath: string | null = null;
  let args: string | null = null;

  for (const token of rest) {
    const lower = token.toLowerCase();
    if (lower === "starter" || lower === "entry") {
      role = "starter";
    } else if (lower === "test" || lower === "tests" || lower === "sample-test") {
      role = "sample-test";
    } else if (
      lower === "attempt" ||
      lower === "attempt-test" ||
      lower === "hidden-test"
    ) {
      role = "attempt-test";
    } else if (lower === "solution") {
      role = "solution";
    } else if (lower.startsWith("file=")) {
      const candidate = sanitizeWorkspacePath(token.slice(5));
      if (candidate) {
        filePath = candidate;
        if (!role) role = "file";
      }
    } else if (lower.startsWith("args=")) {
      args = token.slice(5);
    }
  }

  return { lang, role, filePath, args };
}

/**
 * Parses a markdown exercise section into an interactive Node.js challenge.
 * Recognizes optional fenced block directives:
 * - ```js starter [file=...] [args="..."]
 * - ```js test (or sample-test)
 * - ```js attempt (or attempt-test / hidden-test)
 * - ```js solution
 * - ```txt file=path/to/fixture.txt
 *
 * Sections without explicit directives remain fully usable as interactive Node.js
 * exercises with a clean starter template.
 */
export function parseChallengeFromMarkdown(
  markdown: string,
  title = ""
): ParsedChallenge {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const promptLines: string[] = [];

  let language: "javascript" | "typescript" = "javascript";
  let entryFilename: string | null = null;
  let starterCode: string | null = null;
  let sampleTests: string | null = null;
  let attemptTests: string | null = null;
  let solutionCode: string | null = null;
  let defaultArgs = "";
  const filesMap = new Map<string, string>();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const openMatch = /^(`{3,}|~{3,})(.*)$/.exec(line.trim());

    if (!openMatch) {
      promptLines.push(line);
      i++;
      continue;
    }

    const fenceMarker = openMatch[1];
    const fenceChar = fenceMarker[0];
    const fenceLen = fenceMarker.length;
    const meta = parseFenceInfo(openMatch[2] ?? "");

    const codeLines: string[] = [];
    let j = i + 1;
    let closed = false;
    while (j < lines.length) {
      const closeTrimmed = lines[j].trim();
      if (
        closeTrimmed.startsWith(fenceChar.repeat(fenceLen)) &&
        new RegExp(`^${fenceChar}{${fenceLen},}\\s*$`).test(closeTrimmed)
      ) {
        closed = true;
        break;
      }
      codeLines.push(lines[j]);
      j++;
    }

    const blockContent = codeLines.join("\n");

    if (meta.role) {
      if (meta.args !== null) {
        defaultArgs = meta.args;
      }

      if (meta.role === "starter") {
        starterCode = blockContent;
        if (isTypeScriptLang(meta.lang)) {
          language = "typescript";
        }
        if (meta.filePath) {
          entryFilename = meta.filePath;
        }
      } else if (meta.role === "sample-test") {
        sampleTests = blockContent;
        if (isTypeScriptLang(meta.lang)) {
          language = "typescript";
        }
      } else if (meta.role === "attempt-test") {
        attemptTests = blockContent;
        if (isTypeScriptLang(meta.lang)) {
          language = "typescript";
        }
      } else if (meta.role === "solution") {
        solutionCode = blockContent;
      } else if (meta.role === "file" && meta.filePath) {
        filesMap.set(meta.filePath, blockContent);
      }

      // Skip past the closing fence (hidden from instructions prose)
      i = closed ? j + 1 : lines.length;
      continue;
    }

    // Normal markdown code block — keep in instructions prompt
    promptLines.push(line);
    for (let k = i + 1; k <= (closed ? j : lines.length - 1); k++) {
      promptLines.push(lines[k]);
    }
    i = closed ? j + 1 : lines.length;
  }

  // Collapse excessive blank lines left behind by stripped meta fences
  const promptMarkdown = promptLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const resolvedEntry =
    entryFilename ?? (language === "typescript" ? "solution.ts" : "solution.js");

  const hasExplicitStarter = starterCode !== null;
  const resolvedStarter =
    starterCode ?? buildDefaultStarter(title, language);

  const files: ChallengeWorkspaceFile[] = Array.from(filesMap.entries()).map(
    ([path, content]) => ({ path, content })
  );

  return {
    promptMarkdown,
    language,
    entryFilename: resolvedEntry,
    starterCode: resolvedStarter,
    hasExplicitStarter,
    sampleTests,
    attemptTests,
    solutionCode,
    files,
    defaultArgs,
  };
}
