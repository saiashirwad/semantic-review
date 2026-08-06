import { describe, expect, test } from "bun:test";
import { bindAnalysis, type Analysis } from "../src/analysis.ts";
import { parseDiff } from "../src/diff.ts";

const DIFF = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1,2 +1,3 @@
 context
-old
+new
+more
`;

function base(over: Partial<Analysis> = {}): Analysis {
  return {
    title: "t",
    summary: "s",
    diagram: "",
    sections: [
      {
        heading: "h",
        intro: "i",
        diagram: "",
        snippets: [{ hunk_id: "h1", from: 2, to: 3, note: "n" }],
      },
    ],
    findings: [{ title: "f", severity: "major", hunk_id: "h1", line: 2, body: "b", recommendation: "" }],
    notes: [],
    ...over,
  };
}

describe("bindAnalysis", () => {
  const files = parseDiff(DIFF);

  test("keeps valid hunk refs", () => {
    const bound = bindAnalysis(base(), files);
    expect(bound.sections[0].snippets).toHaveLength(1);
    expect(bound.findings).toHaveLength(1);
    expect(bound.findings[0].line).toBe(2);
  });

  test("drops snippets and findings with unknown hunk ids", () => {
    const bound = bindAnalysis(
      base({
        sections: [
          {
            heading: "h",
            intro: "i",
            diagram: "",
            snippets: [
              { hunk_id: "h1", from: 2, to: 2, note: "" },
              { hunk_id: "h99", from: 1, to: 1, note: "" },
            ],
          },
        ],
        findings: [
          { title: "ok", severity: "info", hunk_id: "h1", line: null, body: "b", recommendation: "" },
          { title: "bad", severity: "info", hunk_id: "h99", line: null, body: "b", recommendation: "" },
        ],
      }),
      files,
    );
    expect(bound.sections[0].snippets.map((s) => s.hunk_id)).toEqual(["h1"]);
    expect(bound.findings.map((f) => f.title)).toEqual(["ok"]);
  });

  test("nulls out snippet ranges and finding lines that miss the hunk", () => {
    const bound = bindAnalysis(
      base({
        sections: [
          {
            heading: "h",
            intro: "i",
            diagram: "",
            snippets: [{ hunk_id: "h1", from: 900, to: 999, note: "" }],
          },
        ],
        findings: [{ title: "f", severity: "minor", hunk_id: "h1", line: 999, body: "b", recommendation: "" }],
      }),
      files,
    );
    expect(bound.sections[0].snippets[0]).toEqual({ hunk_id: "h1", from: null, to: null, note: "" });
    expect(bound.findings[0].line).toBeNull();
  });
});
