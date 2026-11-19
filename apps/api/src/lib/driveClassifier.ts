import {
  PROJECT_DIFFICULTIES,
  RESOURCE_TYPES,
  type ProjectDifficulty,
  type ResourceType,
} from "@repo/shared";
import {
  buildDriveViewUrl,
  GOOGLE_SLIDES_MIME,
  isMarkdownFile,
  type DriveFileEntry,
} from "./driveClient.js";

export interface ParsedFrontmatter {
  day?: number;
  title?: string;
  description?: string;
  summary?: string;
  type?: ResourceType;
  order?: number;
  ignore?: boolean;
  difficulty?: ProjectDifficulty;
  estimatedMinutes?: number;
  tags?: string[];
}

export interface ClassifiedResource {
  kind: "resource";
  dayNumber: number;
  title: string;
  description: string;
  type: ResourceType;
  url: string;
  content: string | null;
  order: number;
  driveFileId: string;
  driveModifiedTime: Date | null;
  driveMd5Checksum: string | null;
  driveSourcePath: string;
}

export interface ClassifiedMiniProject {
  kind: "mini-project";
  dayNumber: number;
  title: string | null;
  summary: string | null;
  instructions: string;
  difficulty?: ProjectDifficulty;
  estimatedMinutes?: number;
  tags?: string[];
  order: number;
  driveFileId: string;
  driveModifiedTime: Date | null;
  driveMd5Checksum: string | null;
  driveSourcePath: string;
}

export interface ClassifiedSkip {
  kind: "skip";
  reason: string;
}

export interface ClassifiedUnknown {
  kind: "unclassified";
  reason: string;
}

export type ClassifiedDriveItem =
  | ClassifiedResource
  | ClassifiedMiniProject
  | ClassifiedSkip
  | ClassifiedUnknown;

const ROOT_FILE_DAY_FALLBACKS: Record<string, { day: number; order: number }> = {
  "day0-setup-checklist.md": { day: 1, order: 20 },
  "nodejs-curriculum.md": { day: 1, order: 21 },
  "mini-projects-and-exercises-handbook.md": { day: 1, order: 22 },
  "one-page-cheat-sheets.md": { day: 2, order: 20 },
  "collaborative-project-ideas.md": { day: 5, order: 20 },
};

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function parseMarkdownFrontmatter(raw: string): {
  frontmatter: ParsedFrontmatter;
  body: string;
} {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: {}, body: raw };
  }

  const endIdx = normalized.indexOf("\n---", 4);
  if (endIdx === -1) {
    return { frontmatter: {}, body: raw };
  }

  const afterFence = normalized.slice(endIdx + 4);
  if (afterFence.length > 0 && !afterFence.startsWith("\n")) {
    return { frontmatter: {}, body: raw };
  }

  const yamlBlock = normalized.slice(4, endIdx);
  const body = afterFence.replace(/^\n+/, "");
  const frontmatter: ParsedFrontmatter = {};

  const lines = yamlBlock.split("\n");
  let currentListKey: string | null = null;
  let currentListValues: string[] = [];

  const flushList = () => {
    if (currentListKey === "tags" && currentListValues.length > 0) {
      frontmatter.tags = currentListValues;
    }
    currentListKey = null;
    currentListValues = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (currentListKey && trimmed.startsWith("- ")) {
      const item = stripQuotes(trimmed.slice(2));
      if (item) currentListValues.push(item);
      continue;
    }

    flushList();

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const rawVal = trimmed.slice(colonIdx + 1).trim();

    if (rawVal === "" && key === "tags") {
      currentListKey = "tags";
      currentListValues = [];
      continue;
    }

    if (key === "day") {
      const n = Number(stripQuotes(rawVal));
      if (Number.isInteger(n) && n >= 1) frontmatter.day = n;
    } else if (key === "order") {
      const n = Number(stripQuotes(rawVal));
      if (Number.isInteger(n) && n >= 0) frontmatter.order = n;
    } else if (key === "estimatedminutes" || key === "estimated_minutes") {
      const n = Number(stripQuotes(rawVal));
      if (Number.isInteger(n) && n > 0) frontmatter.estimatedMinutes = n;
    } else if (key === "ignore") {
      const lowered = stripQuotes(rawVal).toLowerCase();
      frontmatter.ignore = lowered === "true" || lowered === "yes";
    } else if (key === "title") {
      const val = stripQuotes(rawVal);
      if (val) frontmatter.title = val;
    } else if (key === "description") {
      const val = stripQuotes(rawVal);
      if (val) frontmatter.description = val;
    } else if (key === "summary") {
      const val = stripQuotes(rawVal);
      if (val) frontmatter.summary = val;
    } else if (key === "type") {
      const upper = stripQuotes(rawVal).toUpperCase() as ResourceType;
      if ((RESOURCE_TYPES as readonly string[]).includes(upper)) {
        frontmatter.type = upper;
      }
    } else if (key === "difficulty") {
      const upper = stripQuotes(rawVal).toUpperCase() as ProjectDifficulty;
      if ((PROJECT_DIFFICULTIES as readonly string[]).includes(upper)) {
        frontmatter.difficulty = upper;
      }
    } else if (key === "tags") {
      const inner = rawVal.replace(/^\[/, "").replace(/\]$/, "");
      const parsed = inner
        .split(",")
        .map((t) => stripQuotes(t))
        .filter(Boolean);
      if (parsed.length > 0) frontmatter.tags = parsed;
    }
  }

  flushList();
  return { frontmatter, body };
}

export function extractFirstHeading(markdown: string): string | null {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    const match = /^#\s+(.+)$/.exec(line.trim());
    if (match) {
      return match[1].trim().replace(/`/g, "");
    }
  }
  return null;
}

export function extractFirstParagraph(markdown: string): string | null {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const buffer: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (buffer.length > 0) break;
      continue;
    }
    if (
      line.startsWith("#") ||
      line.startsWith("```") ||
      line.startsWith("---") ||
      line.startsWith("|") ||
      line.startsWith(">") ||
      line.startsWith("- ") ||
      line.startsWith("* ")
    ) {
      if (buffer.length > 0) break;
      continue;
    }
    buffer.push(line);
  }

  if (buffer.length === 0) return null;
  const plain = buffer
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return null;
  return plain.length > 260 ? `${plain.slice(0, 257).trimEnd()}...` : plain;
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.(md|markdown)$/i, "");
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function inferDayFromHeading(heading: string | null): number | null {
  if (!heading) return null;
  const parenMatch = /\(Days?\s+(\d+)/i.exec(heading);
  if (parenMatch) {
    const n = Number(parenMatch[1]);
    return n === 0 ? 1 : n;
  }
  const dayMatch = /\bDay\s+(\d+)\b/i.exec(heading);
  if (dayMatch) {
    const n = Number(dayMatch[1]);
    return n === 0 ? 1 : n;
  }
  return null;
}

function inferDayFromFilename(filename: string): number | null {
  const match = /\bday[-_\s]?(\d+)\b/i.exec(filename);
  if (!match) return null;
  const n = Number(match[1]);
  return n === 0 ? 1 : n;
}

function parseModifiedTime(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function classifyDriveFile(
  file: DriveFileEntry,
  rawMarkdown?: string
): ClassifiedDriveItem {
  if (file.name.startsWith("_") || file.name.startsWith(".")) {
    return { kind: "skip", reason: "Filename prefixed with _ or ." };
  }

  const driveModifiedTime = parseModifiedTime(file.modifiedTime);
  const folder = (file.folderName ?? "").trim().toLowerCase();

  // 1. Google Slides presentations
  if (file.mimeType === GOOGLE_SLIDES_MIME) {
    const dayMatch = /^Day\s+(\d+)\b/i.exec(file.name.trim());
    if (!dayMatch) {
      return {
        kind: "unclassified",
        reason: `Presentation "${file.sourcePath}" does not start with "Day N"`,
      };
    }
    const dayNumber = Number(dayMatch[1]);
    const isRecap = /\brecap\b/i.test(file.name);
    return {
      kind: "resource",
      dayNumber,
      title: file.name.trim(),
      description: isRecap
        ? `Recap Google Slides presentation for Day ${dayNumber}.`
        : `Google Slides presentation for Day ${dayNumber}.`,
      type: "SLIDES",
      url: buildDriveViewUrl(file),
      content: null,
      order: isRecap ? 2 : 1,
      driveFileId: file.id,
      driveModifiedTime,
      driveMd5Checksum: file.md5Checksum,
      driveSourcePath: file.sourcePath,
    };
  }

  // 2. Non-markdown files are ignored unless explicitly handled
  if (!isMarkdownFile(file)) {
    return {
      kind: "skip",
      reason: `Unsupported file type (${file.mimeType})`,
    };
  }

  const { frontmatter, body } = parseMarkdownFrontmatter(rawMarkdown ?? "");
  if (frontmatter.ignore) {
    return { kind: "skip", reason: "Excluded by frontmatter ignore: true" };
  }

  const heading = extractFirstHeading(body);
  const excerpt = extractFirstParagraph(body);
  const viewUrl = buildDriveViewUrl(file);

  // 3. Mini-Projects folder
  if (folder === "mini-projects") {
    const dayNumber =
      frontmatter.day ??
      inferDayFromFilename(file.name) ??
      inferDayFromHeading(heading);

    if (!dayNumber) {
      return {
        kind: "unclassified",
        reason: `Could not determine day number for mini-project "${file.sourcePath}"`,
      };
    }

    return {
      kind: "mini-project",
      dayNumber,
      title: frontmatter.title ?? null,
      summary: frontmatter.summary ?? frontmatter.description ?? null,
      instructions: body,
      difficulty: frontmatter.difficulty,
      estimatedMinutes: frontmatter.estimatedMinutes,
      tags: frontmatter.tags,
      order: frontmatter.order ?? dayNumber,
      driveFileId: file.id,
      driveModifiedTime,
      driveMd5Checksum: file.md5Checksum,
      driveSourcePath: file.sourcePath,
    };
  }

  // 4. Coding Exercises folder
  if (folder === "coding exercises") {
    const dayNumber =
      frontmatter.day ??
      inferDayFromFilename(file.name) ??
      inferDayFromHeading(heading);

    if (!dayNumber) {
      return {
        kind: "unclassified",
        reason: `Could not determine day number for exercise "${file.sourcePath}"`,
      };
    }

    const lowerName = file.name.toLowerCase();
    const isExactDayFile = /^day-?\d+\.(md|markdown)$/.test(lowerName);
    const isRecap = lowerName.includes("recap");

    const defaultTitle = isExactDayFile
      ? `Day ${dayNumber} Coding Exercises`
      : heading || titleFromFilename(file.name);

    const defaultOrder = isRecap ? 3 : isExactDayFile ? 4 : 5;

    return {
      kind: "resource",
      dayNumber,
      title: frontmatter.title ?? defaultTitle,
      description:
        frontmatter.description ??
        excerpt ??
        `Coding exercises for Day ${dayNumber}.`,
      type: frontmatter.type ?? "ASSIGNMENT",
      url: viewUrl,
      content: body,
      order: frontmatter.order ?? defaultOrder,
      driveFileId: file.id,
      driveModifiedTime,
      driveMd5Checksum: file.md5Checksum,
      driveSourcePath: file.sourcePath,
    };
  }

  // 5. Cheat-Sheets folder
  if (folder === "cheat-sheets") {
    const dayNumber =
      frontmatter.day ??
      inferDayFromHeading(heading) ??
      inferDayFromFilename(file.name) ??
      1;

    const numMatch = /^(\d+)/.exec(file.name);
    const defaultOrder = numMatch ? 10 + Number(numMatch[1]) : 15;

    return {
      kind: "resource",
      dayNumber,
      title: frontmatter.title ?? heading ?? titleFromFilename(file.name),
      description:
        frontmatter.description ??
        excerpt ??
        `Reference cheat sheet (${file.name}).`,
      type: frontmatter.type ?? "READING",
      url: viewUrl,
      content: body,
      order: frontmatter.order ?? defaultOrder,
      driveFileId: file.id,
      driveModifiedTime,
      driveMd5Checksum: file.md5Checksum,
      driveSourcePath: file.sourcePath,
    };
  }

  // 6. Root-level (or other subfolder) markdown files
  const rootFallback = ROOT_FILE_DAY_FALLBACKS[file.name.toLowerCase()];
  const dayNumber =
    frontmatter.day ??
    rootFallback?.day ??
    inferDayFromFilename(file.name) ??
    inferDayFromHeading(heading) ??
    1;

  return {
    kind: "resource",
    dayNumber,
    title: frontmatter.title ?? heading ?? titleFromFilename(file.name),
    description:
      frontmatter.description ??
      excerpt ??
      `Course reading synced from Google Drive (${file.sourcePath}).`,
    type: frontmatter.type ?? "READING",
    url: viewUrl,
    content: body,
    order: frontmatter.order ?? rootFallback?.order ?? 25,
    driveFileId: file.id,
    driveModifiedTime,
    driveMd5Checksum: file.md5Checksum,
    driveSourcePath: file.sourcePath,
  };
}
