import type { Analysis } from "../src/analysis.ts";
import { hunkById, hunkHasLine, hunkHasRange, linesInRange, type DiffFile } from "../src/diff.ts";

export interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

/** Structural quality checks shared by `bun run eval` (and unit-tested). */
export function scoreAnalysis(analysis: Analysis, files: DiffFile[]): Check[] {
  const hunks = hunkById(files);
  const snippets = analysis.sections.flatMap((s) => s.snippets);

  const badIds = snippets.filter((s) => !hunks.has(s.hunk_id)).map((s) => s.hunk_id);

  const emptyRanges = snippets.filter((s) => {
    const entry = hunks.get(s.hunk_id);
    if (!entry || s.from == null || s.to == null) return false;
    return !hunkHasRange(entry.hunk, s.from, s.to);
  });

  const longSnippets = snippets.filter((s) => {
    const entry = hunks.get(s.hunk_id);
    if (!entry) return false;
    const count =
      s.from == null || s.to == null ? entry.hunk.lines.length : linesInRange(entry.hunk, s.from, s.to).length;
    return count > 20;
  });

  const badDiagrams = [analysis.diagram, ...analysis.sections.map((s) => s.diagram)].filter(
    (d) => d !== "" && !/^\s*(flowchart|graph|sequenceDiagram)/.test(d),
  );

  const badFindingIds = analysis.findings.filter((f) => !hunks.has(f.hunk_id)).map((f) => f.hunk_id);
  const missedFindingLines = analysis.findings.filter((f) => {
    const entry = hunks.get(f.hunk_id);
    if (!entry || f.line == null) return false;
    return !hunkHasLine(entry.hunk, f.line);
  });
  const emptyFindings = analysis.findings.filter((f) => f.body.trim() === "" || f.title.trim() === "");

  return [
    { name: "hunk ids exist", pass: badIds.length === 0, detail: badIds.join(", ") },
    {
      name: "ranges hit lines",
      pass: emptyRanges.length === 0,
      detail: emptyRanges.map((s) => `${s.hunk_id}:${s.from}-${s.to}`).join(", "),
    },
    {
      name: "snippets ≤20 lines",
      pass: longSnippets.length === 0,
      detail: longSnippets.map((s) => s.hunk_id).join(", "),
    },
    { name: "has snippets", pass: snippets.length > 0, detail: `${snippets.length}` },
    {
      name: "1-6 sections",
      pass: analysis.sections.length >= 1 && analysis.sections.length <= 6,
      detail: `${analysis.sections.length}`,
    },
    {
      name: "summary ≤ 350 chars",
      pass: analysis.summary.length <= 350,
      detail: `${analysis.summary.length}`,
    },
    { name: "diagrams look mermaid", pass: badDiagrams.length === 0, detail: `${badDiagrams.length} odd` },
    { name: "finding hunk ids exist", pass: badFindingIds.length === 0, detail: badFindingIds.join(", ") },
    {
      name: "finding lines hit hunks",
      pass: missedFindingLines.length === 0,
      detail: missedFindingLines.map((f) => `${f.hunk_id}:${f.line}`).join(", "),
    },
    { name: "findings have substance", pass: emptyFindings.length === 0, detail: `${emptyFindings.length} empty` },
  ];
}
