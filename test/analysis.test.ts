import { describe, expect, test } from "bun:test";
import { extractAnalysis } from "../src/analysis";

const VALID = JSON.stringify({
  title: "t",
  summary: "s",
  diagram: "",
  sections: [
    {
      heading: "h",
      intro: "i",
      diagram: "",
      snippets: [{ hunk_id: "h1", from: 2, to: 4, note: "" }],
    },
  ],
  notes: [],
});

describe("extractAnalysis", () => {
  test("parses a bare JSON object", () => {
    expect(extractAnalysis(VALID).title).toBe("t");
  });

  test("defaults findings to [] for pre-findings analyses", () => {
    expect(extractAnalysis(VALID).findings).toEqual([]);
  });

  test("parses findings", () => {
    const withFindings = JSON.stringify({
      ...JSON.parse(VALID),
      findings: [
        { title: "f", severity: "major", hunk_id: "h1", line: 3, body: "b", recommendation: "r" },
      ],
    });
    const { findings } = extractAnalysis(withFindings);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("major");
  });

  test("rejects an unknown severity", () => {
    const bad = JSON.stringify({
      ...JSON.parse(VALID),
      findings: [{ title: "f", severity: "catastrophic", hunk_id: "h1", line: null, body: "b", recommendation: "" }],
    });
    expect(() => extractAnalysis(bad)).toThrow();
  });

  test("strips markdown fences", () => {
    expect(extractAnalysis("```json\n" + VALID + "\n```").title).toBe("t");
  });

  test("finds the object inside surrounding prose", () => {
    expect(extractAnalysis("Here is my analysis:\n" + VALID + "\nHope that helps!").title).toBe("t");
  });

  test("throws when there is no JSON at all", () => {
    expect(() => extractAnalysis("I cannot analyze this diff.")).toThrow("no JSON object found");
  });

  test("throws when the JSON does not match the schema", () => {
    expect(() => extractAnalysis('{"title": "t"}')).toThrow();
  });
});
