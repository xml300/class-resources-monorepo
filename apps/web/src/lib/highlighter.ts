import {
  createHighlighterCore,
  type HighlighterCore,
  type ThemedToken,
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { normalizeCodeLanguage, type CodeLanguage } from "@repo/shared";

const THEME_NAME = "github-dark-default";

let highlighterPromise: Promise<HighlighterCore> | null = null;

async function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [import("@shikijs/themes/github-dark-default")],
      langs: [
        import("@shikijs/langs/typescript"),
        import("@shikijs/langs/javascript"),
        import("@shikijs/langs/tsx"),
        import("@shikijs/langs/jsx"),
        import("@shikijs/langs/bash"),
        import("@shikijs/langs/json"),
        import("@shikijs/langs/sql"),
        import("@shikijs/langs/dockerfile"),
        import("@shikijs/langs/html"),
        import("@shikijs/langs/css"),
        import("@shikijs/langs/yaml"),
        import("@shikijs/langs/markdown"),
        import("@shikijs/langs/python"),
        import("@shikijs/langs/diff"),
      ],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
}

export type HighlightedLines = ThemedToken[][];

export async function highlightCodeToTokens(
  code: string,
  language?: string | null
): Promise<HighlightedLines | null> {
  const normalized: CodeLanguage | null = normalizeCodeLanguage(language);
  if (!normalized || normalized === "plaintext") {
    return null;
  }

  try {
    const highlighter = await getHighlighter();
    const result = highlighter.codeToTokens(code, {
      lang: normalized,
      theme: THEME_NAME,
    });
    return result.tokens;
  } catch {
    return null;
  }
}
