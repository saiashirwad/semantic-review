import { describe, expect, test } from "bun:test";
import type { Analysis } from "../src/analysis.ts";
import { parseDiff } from "../src/diff.ts";
import { scoreAnalysis } from "../evals/score.ts";

const DIFF = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1,2 +1,3 @@
 context
-old
+new
+more
`;

const good = (): Analysis => ({
  title: "t",
  summary: "short",
  diagram: "",
  sections: [
    {
      heading: "h",
      intro: "i",
      diagram: "",
      snippets: [{ hunk_id: "h1", from: 2, to: 3, note: "" }],
    },
  ],
  findings: [{ title: "f", severity: "major", hunk_id: "h1", line: 2, body: "body", recommendation: "" }],
  notes: [],
});

describe("scoreAnalysis", () => {
  const files = parseDiff(DIFF);

  test("passes a well-formed analysis", () => {
    const checks = scoreAnalysis(good(), files);
    expect(checks.every((c) => c.pass)).toBe(true);
  });

  test("fails unknown hunk ids and bad finding lines", () => {
    const analysis = good();
    analysis.sections[0].snippets[0].hunk_id = "h99";
    analysis.findings[0].line = 999;
    const byName = Object.fromEntries(scoreAnalysis(analysis, files).map((c) => [c.name, c]));
    expect(byName["hunk ids exist"].pass).toBe(false);
    expect(byName["finding lines hit hunks"].pass).toBe(false);
  });

  test("fails empty finding substance", () => {
    const analysis = good();
    analysis.findings[0].body = "  ";
    const check = scoreAnalysis(analysis, files).find((c) => c.name === "findings have substance")!;
    expect(check.pass).toBe(false);
  });
});
