import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyDriveFile,
  parseMarkdownFrontmatter,
} from "./driveClassifier.js";
import {
  extractGoogleDriveIdFromUrl,
  GOOGLE_SLIDES_MIME,
  type DriveFileEntry,
} from "./driveClient.js";

function makeFile(overrides: Partial<DriveFileEntry>): DriveFileEntry {
  return {
    id: "file-123",
    name: "example.md",
    mimeType: "text/markdown",
    modifiedTime: "2026-11-18T12:00:00.000Z",
    md5Checksum: "abc123",
    webViewLink: "https://drive.google.com/file/d/file-123/view",
    sourcePath: "example.md",
    folderName: null,
    ...overrides,
  };
}

test("parseMarkdownFrontmatter parses YAML scalars, tags, and strips header", () => {
  const raw = `---
day: 4
title: "Day 4 Synthesis Exercises"
description: Full Express + TypeScript synthesis practice
type: ASSIGNMENT
order: 5
tags: [Express, TypeScript, Zod]
---

# Ignored Heading

Body content here.`;

  const { frontmatter, body } = parseMarkdownFrontmatter(raw);
  assert.equal(frontmatter.day, 4);
  assert.equal(frontmatter.title, "Day 4 Synthesis Exercises");
  assert.equal(
    frontmatter.description,
    "Full Express + TypeScript synthesis practice"
  );
  assert.equal(frontmatter.type, "ASSIGNMENT");
  assert.equal(frontmatter.order, 5);
  assert.deepEqual(frontmatter.tags, ["Express", "TypeScript", "Zod"]);
  assert.ok(body.startsWith("# Ignored Heading"));
});

test("classifyDriveFile maps Coding Exercises/day-04-synthesis.md to Day 4 ASSIGNMENT", () => {
  const file = makeFile({
    id: "synth-id",
    name: "day-04-synthesis.md",
    sourcePath: "Coding Exercises/day-04-synthesis.md",
    folderName: "Coding Exercises",
  });
  const md = `# Day 4 Synthesis: Express + TypeScript End-to-End\n\nBuild a complete layered API from scratch.`;
  const result = classifyDriveFile(file, md);

  assert.equal(result.kind, "resource");
  if (result.kind === "resource") {
    assert.equal(result.dayNumber, 4);
    assert.equal(result.type, "ASSIGNMENT");
    assert.equal(
      result.title,
      "Day 4 Synthesis: Express + TypeScript End-to-End"
    );
    assert.equal(result.order, 5);
    assert.equal(result.driveFileId, "synth-id");
    assert.equal(result.driveSourcePath, "Coding Exercises/day-04-synthesis.md");
  }
});

test("classifyDriveFile maps Coding Exercises/day-04.md and day-03-recap.md with expected ordering", () => {
  const mainEx = classifyDriveFile(
    makeFile({
      name: "day-04.md",
      sourcePath: "Coding Exercises/day-04.md",
      folderName: "Coding Exercises",
    }),
    "# Day 4: Express.js\n\nExercises."
  );
  const recapEx = classifyDriveFile(
    makeFile({
      name: "day-03-recap.md",
      sourcePath: "Coding Exercises/day-03-recap.md",
      folderName: "Coding Exercises",
    }),
    "# Day 3 Recap: Day 1 & Day 2 Deep-Dive Exercises\n\nRecap exercises."
  );

  assert.equal(mainEx.kind, "resource");
  assert.equal(recapEx.kind, "resource");
  if (mainEx.kind === "resource" && recapEx.kind === "resource") {
    assert.equal(mainEx.dayNumber, 4);
    assert.equal(mainEx.title, "Day 4 Coding Exercises");
    assert.equal(mainEx.order, 4);
    assert.equal(recapEx.dayNumber, 3);
    assert.equal(recapEx.order, 3);
  }
});

test("classifyDriveFile maps Mini-Projects/day-04.md to Day 4 primary mini-project", () => {
  const result = classifyDriveFile(
    makeFile({
      id: "mp-4",
      name: "day-04.md",
      sourcePath: "Mini-Projects/day-04.md",
      folderName: "Mini-Projects",
    }),
    "# Day 4 Mini-Project\n\nInstructions here."
  );

  assert.equal(result.kind, "mini-project");
  if (result.kind === "mini-project") {
    assert.equal(result.dayNumber, 4);
    assert.equal(result.isPrimaryDayProject, true);
    assert.equal(result.title, null);
    assert.equal(result.summary, null);
    assert.equal(result.order, 4);
    assert.equal(result.instructions, "# Day 4 Mini-Project\n\nInstructions here.");
    assert.equal(result.driveFileId, "mp-4");
  }
});

test("classifyDriveFile maps extra Mini-Projects files like day-05-todo-api-dossier.md with heading title and excerpt", () => {
  const result = classifyDriveFile(
    makeFile({
      id: "mp-5-dossier",
      name: "day-05-todo-api-dossier.md",
      sourcePath: "Mini-Projects/day-05-todo-api-dossier.md",
      folderName: "Mini-Projects",
    }),
    "# Todo Backend API — Group Project Brief\n\n**Stack:** Node.js, Express, TypeScript\n\n---\n\n## Overview"
  );

  assert.equal(result.kind, "mini-project");
  if (result.kind === "mini-project") {
    assert.equal(result.dayNumber, 5);
    assert.equal(result.isPrimaryDayProject, false);
    assert.equal(result.title, "Todo Backend API — Group Project Brief");
    assert.equal(result.summary, "Stack: Node.js, Express, TypeScript");
    assert.equal(result.order, 6);
    assert.equal(result.driveFileId, "mp-5-dossier");
  }
});

test("classifyDriveFile infers day from Cheat-Sheets heading", () => {
  const result = classifyDriveFile(
    makeFile({
      name: "04-postgres-drizzle-and-auth.md",
      sourcePath: "Cheat-Sheets/04-postgres-drizzle-and-auth.md",
      folderName: "Cheat-Sheets",
    }),
    "# Cheat Sheet: PostgreSQL, Drizzle & Auth Security (Days 5–6)\n\nQuick reference."
  );

  assert.equal(result.kind, "resource");
  if (result.kind === "resource") {
    assert.equal(result.dayNumber, 5);
    assert.equal(result.type, "READING");
    assert.equal(result.order, 14);
  }
});

test("classifyDriveFile maps Google Slides decks and skips ignored files", () => {
  const slides = classifyDriveFile(
    makeFile({
      id: "slides-4",
      name: "Day 4: Express.js + TypeScript Architecture",
      mimeType: GOOGLE_SLIDES_MIME,
      sourcePath: "Day 4: Express.js + TypeScript Architecture",
      folderName: null,
    })
  );
  assert.equal(slides.kind, "resource");
  if (slides.kind === "resource") {
    assert.equal(slides.dayNumber, 4);
    assert.equal(slides.type, "SLIDES");
    assert.equal(slides.order, 1);
    assert.equal(
      slides.url,
      "https://docs.google.com/presentation/d/slides-4"
    );
  }

  const ignored = classifyDriveFile(
    makeFile({ name: "draft.md", sourcePath: "draft.md" }),
    "---\nignore: true\n---\n# Draft"
  );
  assert.equal(ignored.kind, "skip");
});

test("extractGoogleDriveIdFromUrl extracts file and presentation IDs", () => {
  assert.equal(
    extractGoogleDriveIdFromUrl(
      "https://drive.google.com/file/d/1HAd6bIA_M4EMaP7pYiWw6AjgT7XjMm8r/view"
    ),
    "1HAd6bIA_M4EMaP7pYiWw6AjgT7XjMm8r"
  );
  assert.equal(
    extractGoogleDriveIdFromUrl(
      "https://docs.google.com/presentation/d/15l49rcEJFVVFyZcNFsdtUSxYn9Y9eIAEO4kvCTsx4HY"
    ),
    "15l49rcEJFVVFyZcNFsdtUSxYn9Y9eIAEO4kvCTsx4HY"
  );
  assert.equal(extractGoogleDriveIdFromUrl("https://example.com/file.md"), null);
});
