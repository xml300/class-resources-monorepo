import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseChallengeFromMarkdown } from "./challengeParser.js";

describe("parseChallengeFromMarkdown", () => {
  it("extracts starter, sample test, attempt test, solution, and fixture files while stripping them from prompt", () => {
    const md = `## Exercise 1: Count Log Errors

Read \`logs.txt\` using \`node:fs/promises\` and export \`countErrors(filePath)\`.

\`\`\`js
// Example usage shown in instructions
console.log(await countErrors("./logs.txt"));
\`\`\`

\`\`\`txt file=logs.txt
INFO Server started
ERROR Disk full
ERROR Timeout
\`\`\`

\`\`\`js starter args="./logs.txt"
import { readFile } from "node:fs/promises";

export async function countErrors(filePath) {
  return 0;
}
\`\`\`

\`\`\`js test
import test from "node:test";
import assert from "node:assert/strict";
import { countErrors } from "./solution.js";

test("counts ERROR lines", async () => {
  assert.equal(await countErrors("./logs.txt"), 2);
});
\`\`\`

\`\`\`js attempt
import test from "node:test";
import assert from "node:assert/strict";
import { countErrors } from "./solution.js";

test("counts ERROR lines accurately", async () => {
  assert.equal(await countErrors("./logs.txt"), 2);
});
\`\`\`

\`\`\`js solution
import { readFile } from "node:fs/promises";

export async function countErrors(filePath) {
  const text = await readFile(filePath, "utf8");
  return text.split("\\n").filter((l) => l.startsWith("ERROR")).length;
}
\`\`\`
`;

    const parsed = parseChallengeFromMarkdown(md, "Exercise 1: Count Log Errors");

    assert.equal(parsed.language, "javascript");
    assert.equal(parsed.entryFilename, "solution.js");
    assert.equal(parsed.hasExplicitStarter, true);
    assert.equal(parsed.defaultArgs, "./logs.txt");
    assert.ok(parsed.starterCode.includes("export async function countErrors"));
    assert.ok(parsed.sampleTests?.includes('test("counts ERROR lines"'));
    assert.ok(parsed.attemptTests?.includes("counts ERROR lines accurately"));
    assert.ok(parsed.solutionCode?.includes('startsWith("ERROR")'));
    assert.equal(parsed.files.length, 1);
    assert.equal(parsed.files[0].path, "logs.txt");
    assert.ok(parsed.files[0].content.includes("ERROR Disk full"));

    // Instructions keep normal code blocks but strip hidden challenge blocks
    assert.ok(parsed.promptMarkdown.includes("Example usage shown in instructions"));
    assert.ok(!parsed.promptMarkdown.includes("ERROR Disk full"));
    assert.ok(!parsed.promptMarkdown.includes("counts ERROR lines accurately"));
    assert.ok(!parsed.promptMarkdown.includes('startsWith("ERROR")'));
  });

  it("provides a clean fallback starter when markdown has no directives", () => {
    const md = `## Exercise 2: CLI Arguments

Print all CLI arguments passed to \`process.argv.slice(2)\`.
`;
    const parsed = parseChallengeFromMarkdown(md, "Exercise 2: CLI Arguments");
    assert.equal(parsed.hasExplicitStarter, false);
    assert.equal(parsed.sampleTests, null);
    assert.equal(parsed.attemptTests, null);
    assert.equal(parsed.solutionCode, null);
    assert.equal(parsed.files.length, 0);
    assert.ok(parsed.starterCode.includes("Exercise 2: CLI Arguments"));
    assert.ok(parsed.promptMarkdown.includes("process.argv.slice(2)"));
  });

  it("rejects path traversal in file= directives", () => {
    const md = `\`\`\`txt file=../secrets.txt
nope
\`\`\``;
    const parsed = parseChallengeFromMarkdown(md, "Security");
    assert.equal(parsed.files.length, 0);
  });
});
