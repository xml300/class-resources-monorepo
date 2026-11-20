import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildGithubFolderUrl,
  extractSubtreeBlobs,
  filterPreservedTreeBlobs,
  joinRepoFilePath,
  normalizeRepoTargetPath,
  parseGithubRepoUrl,
  shouldIgnoreGithubFilePath,
  suggestRunCommandFromFiles,
} from "./githubUrl.js";

describe("parseGithubRepoUrl", () => {
  it("parses standard https GitHub URLs", () => {
    const parsed = parseGithubRepoUrl("https://github.com/xml300/my-demos");
    assert.deepEqual(parsed, {
      owner: "xml300",
      repo: "my-demos",
      branch: undefined,
      subpath: undefined,
      canonicalRepoUrl: "https://github.com/xml300/my-demos",
    });
  });

  it("strips .git suffix and trailing slashes", () => {
    const parsed = parseGithubRepoUrl("https://github.com/xml300/my-demos.git/");
    assert.equal(parsed.owner, "xml300");
    assert.equal(parsed.repo, "my-demos");
    assert.equal(parsed.canonicalRepoUrl, "https://github.com/xml300/my-demos");
  });

  it("extracts branch and subpath from /tree/ URLs", () => {
    const parsed = parseGithubRepoUrl(
      "https://github.com/xml300/my-demos/tree/main/day-03/express-demo"
    );
    assert.equal(parsed.owner, "xml300");
    assert.equal(parsed.repo, "my-demos");
    assert.equal(parsed.branch, "main");
    assert.equal(parsed.subpath, "day-03/express-demo");
  });

  it("supports owner/repo shorthand", () => {
    const parsed = parseGithubRepoUrl("xml300/my-demos");
    assert.equal(parsed.owner, "xml300");
    assert.equal(parsed.repo, "my-demos");
    assert.equal(parsed.canonicalRepoUrl, "https://github.com/xml300/my-demos");
  });

  it("rejects non-GitHub hosts", () => {
    assert.throws(() => parseGithubRepoUrl("https://gitlab.com/a/b"));
  });
});

describe("normalizeRepoTargetPath & joinRepoFilePath", () => {
  it("normalizes slashes and allows empty root path", () => {
    assert.equal(normalizeRepoTargetPath(""), "");
    assert.equal(normalizeRepoTargetPath("  /day-01/demo/ "), "day-01/demo");
    assert.equal(
      joinRepoFilePath("day-01/demo", "src/index.ts"),
      "day-01/demo/src/index.ts"
    );
    assert.equal(joinRepoFilePath("", "src/index.ts"), "src/index.ts");
  });

  it("rejects path traversal", () => {
    assert.throws(() => normalizeRepoTargetPath("../secret"));
  });
});

describe("filterPreservedTreeBlobs", () => {
  const blobs = [
    { path: "README.md", mode: "100644", type: "blob" as const, sha: "1" },
    {
      path: "day-01/demo/index.js",
      mode: "100644",
      type: "blob" as const,
      sha: "2",
    },
    {
      path: "day-01/demo-extra/index.js",
      mode: "100644",
      type: "blob" as const,
      sha: "3",
    },
    {
      path: "day-02/other/app.ts",
      mode: "100644",
      type: "blob" as const,
      sha: "4",
    },
  ];

  it("removes only blobs inside the target subfolder", () => {
    const kept = filterPreservedTreeBlobs(blobs, "day-01/demo");
    assert.deepEqual(
      kept.map((b) => b.path),
      ["README.md", "day-01/demo-extra/index.js", "day-02/other/app.ts"]
    );
  });

  it("replaces everything when targetPath is empty (root)", () => {
    const kept = filterPreservedTreeBlobs(blobs, "");
    assert.deepEqual(kept, []);
  });
});

describe("extractSubtreeBlobs", () => {
  const blobs = [
    { path: "README.md", mode: "100644", type: "blob" as const, sha: "1", size: 10 },
    { path: "day-01/api/package.json", mode: "100644", type: "blob" as const, sha: "2", size: 100 },
    { path: "day-01/api/src/server.js", mode: "100644", type: "blob" as const, sha: "3", size: 200 },
    { path: "day-01/api-v2/index.js", mode: "100644", type: "blob" as const, sha: "4", size: 50 },
  ];

  it("extracts and strips prefix for target subfolder without matching sibling prefixes", () => {
    const extracted = extractSubtreeBlobs(blobs, "day-01/api");
    assert.deepEqual(
      extracted.map((b) => b.relativePath),
      ["package.json", "src/server.js"]
    );
  });

  it("returns all blobs when targetPath is empty", () => {
    const extracted = extractSubtreeBlobs(blobs, "");
    assert.equal(extracted.length, 4);
  });
});

describe("shouldIgnoreGithubFilePath & suggestRunCommandFromFiles", () => {
  it("ignores node_modules, lockfiles, binaries, and secret .env files", () => {
    assert.ok(shouldIgnoreGithubFilePath("node_modules/express/index.js"));
    assert.ok(shouldIgnoreGithubFilePath("package-lock.json"));
    assert.ok(shouldIgnoreGithubFilePath(".env"));
    assert.ok(shouldIgnoreGithubFilePath("assets/logo.png"));
    assert.equal(shouldIgnoreGithubFilePath(".env.example"), null);
    assert.equal(shouldIgnoreGithubFilePath("src/server.ts"), null);
  });

  it("suggests run commands from package.json, html, or entry files", () => {
    assert.equal(
      suggestRunCommandFromFiles([
        { path: "package.json", content: '{"scripts":{"dev":"vite"}}' },
      ]),
      "npm run dev"
    );
    assert.equal(
      suggestRunCommandFromFiles([{ path: "index.html", content: "<h1>Hi</h1>" }]),
      "static"
    );
    assert.equal(
      suggestRunCommandFromFiles([{ path: "server.js", content: "console.log(1)" }]),
      "node server.js"
    );
  });
});

describe("buildGithubFolderUrl", () => {
  it("builds tree URLs for subfolders and root", () => {
    assert.equal(
      buildGithubFolderUrl("xml300", "demos", "main", "day-02/todo app"),
      "https://github.com/xml300/demos/tree/main/day-02/todo%20app"
    );
    assert.equal(
      buildGithubFolderUrl("xml300", "demos", "main", ""),
      "https://github.com/xml300/demos/tree/main"
    );
  });
});

