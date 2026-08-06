import { describe, expect, test } from "bun:test";
import type { Analysis } from "../src/analysis.ts";
import { parseDiff } from "../src/diff.ts";
import { buildReviewPayload } from "../src/payload.ts";

const DIFF = `diff --git a/src/greet.ts b/src/greet.ts
index 0000000..1111111 100644
--- a/src/greet.ts
+++ b/src/greet.ts
@@ -1,3 +1,4 @@
 export function greet(name: string) {
-  return "hi " + name;
+  if (!name) throw new Error("<no name>");
+  return \`hello \${name}\`;
 }
`;

const analysis: Analysis = {
  title: "Greeting rewrite",
  summary: "Switches to template strings.",
  diagram: "flowchart LR\n  a --> b",
  sections: [
    { heading: "Core", intro: "The change.", diagram: "", snippets: [{ hunk_id: "h1", from: 2, to: 3, note: "" }] },
  ],
  findings: [
    { title: "Throws on empty", severity: "major", hunk_id: "h1", line: 2, body: "New throw.", recommendation: "" },
  ],
  notes: [],
};

describe("buildReviewPayload", () => {
  test("carries files with counts and Pierre SSR", async () => {
    const payload = await buildReviewPayload([{ backend: "test", analysis }], parseDiff(DIFF), "server");
    expect(payload.mode).toBe("server");
    expect(payload.title).toBe("Greeting rewrite");
    expect(payload.changeSummary).toBe("1 hunk across 1 file");
    const file = payload.files[0];
    expect(file.path).toBe("src/greet.ts");
    expect(file.adds).toBe(2);
    expect(file.dels).toBe(1);
    expect(payload.totalChangedLines).toBe(3);
    const lines = file.hunks[0].lines;
    expect(lines.every((l) => typeof l.text === "string")).toBe(true);
    expect(lines.some((l) => l.text.includes("<no name>"))).toBe(true);
    // Syntax highlighting lives in Pierre HTML, not per-line spans
    expect(file.hunks[0].pierre?.unified || file.pierre?.unified).toBeTruthy();
    expect(payload.pierre?.css).toBeTruthy();
  });

  test("pre-renders mermaid to SVG and falls back to empty on bad source", async () => {
    const payload = await buildReviewPayload([{ backend: "test", analysis }], parseDiff(DIFF), "export");
    expect(payload.mode).toBe("export");
    expect(payload.results[0].diagrams.top).toContain("<svg");
    const broken = { ...analysis, diagram: "not a diagram %%%" };
    const payload2 = await buildReviewPayload([{ backend: "test", analysis: broken }], parseDiff(DIFF), "export");
    expect(typeof payload2.results[0].diagrams.top).toBe("string");
  });

  test("keeps findings in the analysis", async () => {
    const payload = await buildReviewPayload([{ backend: "test", analysis }], parseDiff(DIFF), "server");
    expect(payload.results[0].analysis.findings[0].severity).toBe("major");
  });

  test("binds analysis refs against the real diff", async () => {
    const dirty: Analysis = {
      ...analysis,
      sections: [
        {
          heading: "Core",
          intro: "The change.",
          diagram: "",
          snippets: [
            { hunk_id: "h1", from: 2, to: 3, note: "" },
            { hunk_id: "h99", from: 1, to: 1, note: "ghost" },
          ],
        },
      ],
      findings: [
        ...analysis.findings,
        { title: "ghost", severity: "info", hunk_id: "h99", line: null, body: "nope", recommendation: "" },
      ],
    };
    const payload = await buildReviewPayload([{ backend: "test", analysis: dirty }], parseDiff(DIFF), "server");
    const bound = payload.results[0].analysis;
    expect(bound.sections[0].snippets.map((s) => s.hunk_id)).toEqual(["h1"]);
    expect(bound.findings.map((f) => f.title)).toEqual(["Throws on empty"]);
  });

  test("payload is JSON-serializable", async () => {
    const payload = await buildReviewPayload([{ backend: "test", analysis }], parseDiff(DIFF), "server");
    const roundTrip = JSON.parse(JSON.stringify(payload));
    expect(roundTrip).toEqual(payload);
  });
});
