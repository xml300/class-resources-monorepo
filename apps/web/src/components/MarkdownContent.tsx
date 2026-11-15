import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const normalized = text.replace(/\\\$/g, "$");
  const parts: ReactNode[] = [];
  const regex =
    /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      parts.push(normalized.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-zinc-100">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={key++} className="italic text-zinc-200">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-emerald-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        parts.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-700 underline-offset-2 hover:text-emerald-300"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < normalized.length) {
    parts.push(normalized.slice(lastIndex));
  }
  return parts;
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|") && !trimmed.includes("-")) return false;
  const cells = splitTableRow(trimmed);
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{2,}:?$/.test(cell.trim()))
  );
}

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Fenced code block
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <pre
          key={key++}
          className="my-3 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-200"
        >
          {lang && (
            <div className="mb-2 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              {lang}
            </div>
          )}
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<hr key={key++} className="my-5 border-zinc-800" />);
      i++;
      continue;
    }

    // Markdown table
    if (
      trimmed.includes("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headers = splitTableRow(line);
      i += 2; // skip header and separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes("|")) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push(
        <div
          key={key++}
          className="my-3 overflow-x-auto rounded-xl border border-zinc-800"
        >
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead className="bg-zinc-950/90 text-zinc-200">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    className="border-b border-zinc-800 px-3.5 py-2.5 font-semibold"
                  >
                    {renderInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 bg-zinc-900/40 text-zinc-300">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-zinc-900/80">
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2.5 align-top">
                      {renderInline(row[cIdx] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-3 border-l-2 border-emerald-600/70 bg-zinc-950/60 py-2 pr-3 pl-4 text-sm leading-relaxed text-zinc-300"
        >
          {renderInline(quoteLines.join(" "))}
        </blockquote>
      );
      continue;
    }

    // Headings
    if (line.startsWith("#### ")) {
      blocks.push(
        <h4
          key={key++}
          className="mt-4 mb-1.5 text-sm font-semibold text-zinc-200"
        >
          {renderInline(line.slice(5))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3
          key={key++}
          className="mt-5 mb-2 text-base font-semibold text-zinc-100"
        >
          {renderInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2
          key={key++}
          className="mt-6 mb-2.5 border-b border-zinc-800/80 pb-1.5 text-lg font-bold text-zinc-100"
        >
          {renderInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={key++} className="mt-6 mb-3 text-xl font-bold text-zinc-100">
          {renderInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: Array<{ text: string; indented: boolean }> = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const indented = /^\s{2,}[-*]\s+/.test(lines[i]);
        items.push({
          text: lines[i].replace(/^\s*[-*]\s+/, ""),
          indented,
        });
        i++;
      }
      blocks.push(
        <ul
          key={key++}
          className="my-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-300"
        >
          {items.map((item, idx) => (
            <li key={idx} className={item.indented ? "ml-4 list-[circle]" : ""}>
              {renderInline(item.text)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol
          key={key++}
          className="my-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-300"
        >
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank line
    if (trimmed === "") {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith(">") &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p
        key={key++}
        className="my-2.5 text-sm leading-relaxed text-zinc-300"
      >
        {renderInline(paraLines.join(" "))}
      </p>
    );
  }

  return <div className="space-y-1">{blocks}</div>;
}
