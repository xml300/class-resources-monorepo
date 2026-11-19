import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";

interface CodeMirrorEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  language?: "javascript" | "typescript" | "json";
  readOnly?: boolean;
  onRun?: () => void;
  className?: string;
}

const darkSurfaceTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#09090b",
      color: "#e4e4e7",
      fontSize: "13px",
      height: "100%",
    },
    ".cm-scroller": {
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      lineHeight: "1.6",
    },
    ".cm-gutters": {
      backgroundColor: "#09090b",
      color: "#52525b",
      borderRight: "1px solid #27272a",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#18181b",
      color: "#a1a1aa",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(39, 39, 42, 0.35)",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "#34d399",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(16, 185, 129, 0.25)",
    },
    "&.cm-focused": {
      outline: "none",
    },
  },
  { dark: true }
);

export function CodeMirrorEditor({
  value,
  onChange,
  language = "javascript",
  readOnly = false,
  onRun,
  className = "",
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);

  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const langExt =
      language === "json"
        ? json()
        : javascript({ typescript: language === "typescript" });

    const runKeymap = keymap.of([
      {
        key: "Mod-Enter",
        run: () => {
          onRunRef.current?.();
          return true;
        },
      },
      indentWithTab,
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        langExt,
        oneDark,
        darkSurfaceTheme,
        runKeymap,
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: container,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Recreate editor only when language or readOnly changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, readOnly]);

  // Sync external value updates (e.g., switching challenges or clicking Reset)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden bg-zinc-950 ${className}`}
    />
  );
}
