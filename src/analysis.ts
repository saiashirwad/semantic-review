import { z } from "zod";
import { hunkById, hunkHasLine, hunkHasRange, type DiffFile } from "./diff.ts";

export const SEVERITIES = ["critical", "major", "minor", "info"] as const;

export const FindingSchema = z.object({
  title: z.string(),
  severity: z.enum(SEVERITIES),
  hunk_id: z.string(),
  // New-file line number; negative = old-file line (deleted); null = whole hunk.
  line: z.number().nullable(),
  body: z.string(),
  recommendation: z.string(),
});

export type Finding = z.infer<typeof FindingSchema>;

export const AnalysisSchema = z.object({
  title: z.string(),
  summary: z.string(),
  diagram: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      intro: z.string(),
      diagram: z.string(),
      snippets: z.array(
        z.object({
          hunk_id: z.string(),
          from: z.number().nullable(),
          to: z.number().nullable(),
          note: z.string(),
        }),
      ),
    }),
  ),
  findings: z.array(FindingSchema),
  notes: z.array(z.string()),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

// Lenient variant for caller-provided JSON (--analysis files, CLI harness
// output): analyses written before findings existed still parse.
export const AnalysisInputSchema = AnalysisSchema.extend({
  findings: z.array(FindingSchema).default([]),
});

// One analysis per backend; the report renders a tab per result.
export interface AnalysisResult {
  backend: string; // label, e.g. "anthropic", "claude", "codex"
  analysis: Analysis;
}

export function analysisPrompt(annotatedDiff: string): string {
  return `You are writing a short semantic review guide for a git diff. Traditional diffs list files alphabetically; your job is to reorganize the change into a brief narrative a reviewer can follow in a minute or two. The reviewer also has the full diff available below your guide, so you do NOT need to show everything — show only the lines that carry the meaning of the change.

Each hunk is labeled "hunk hN". Every line is prefixed with its line number in the new file ("42|+code"); deleted lines carry the old-file number prefixed with a minus ("-17|-code").

Produce a JSON object with exactly this shape:

{
  "title": "short title for the change",
  "summary": "1-2 sentence TL;DR: what the change does and why",
  "diagram": "optional mermaid diagram source, or \\"\\"",
  "sections": [
    {
      "heading": "...",
      "intro": "1-2 sentences introducing this part of the change",
      "diagram": "optional mermaid diagram source for this section, or \\"\\"",
      "snippets": [
        { "hunk_id": "h3", "from": 40, "to": 48, "note": "one short line bridging to the next snippet (or \\"\\")" }
      ]
    }
  ],
  "findings": [
    { "title": "short defect title", "severity": "critical|major|minor|info", "hunk_id": "h3", "line": 42, "body": "what is wrong and why", "recommendation": "concrete fix, or \\"\\"" }
  ],
  "notes": ["risks or things a reviewer should double-check", ...]
}

Rules:
- Be brief. Section intros are 1-2 sentences; snippet notes are one short line or "". No filler.
- "diagram" (top level and per section): include a small mermaid diagram ONLY when that part of the change is genuinely graph-shaped (data flowing through new pieces, call-order changes, moved responsibilities) — a "flowchart LR" or "sequenceDiagram" with 3-8 nodes, no styling directives. The top-level diagram is a whole-change overview; a section diagram covers just that section. Use "" when a diagram would not beat prose — most small changes need none, and few sections deserve their own.
- Snippets are EXCERPTS: pick the smallest line range that shows the interesting part (typically 3-12 lines), using the line-number prefixes. from/to use new-file numbers; for ranges of deleted lines use the old-file numbers (positive). Use null for both to include the whole hunk — only when the hunk is already small.
- Group by code path / concern, not by file. Order sections by importance: core change first.
- Purely mechanical changes (renames, lockfiles, formatting) need no snippet — mention them in one sentence in an intro or the summary.
- Prose is plain text; use backticks for identifiers. No markdown headings.
- "findings" is for concrete defects in the change: bugs, regressions, missing error handling, security issues. Not style nits, and not restatements of notes. Empty array when the change looks correct — most changes have none.
- Finding severity: critical = likely breaks behavior or security; major = probable bug or footgun; minor = worth fixing, not urgent; info = observation worth a look.
- Finding "line" uses the same numbers as snippets: the new-file number, or the old-file number NEGATED for a deleted line ("-17|-code" → -17), or null to flag the whole hunk. "body" says what is wrong and why; "recommendation" gives the concrete fix ("" if none).
- "notes" is for behavior changes, missing tests, edge cases, inconsistencies. Empty array if none.
- Respond with ONLY the JSON object, no fences, no commentary.

The diff:

${annotatedDiff}`;
}

/** Pull a JSON object string out of model/CLI output (fences, trailing prose). */
export function extractJsonObject(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  if (!text.startsWith("{")) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error(`no JSON object found in output:\n${raw.slice(0, 500)}`);
    text = text.slice(start, end + 1);
  }
  return text;
}

/**
 * Single normalizer for every analysis path (API, harness, --analysis).
 * Accepts pure JSON or fence-wrapped CLI prose; always applies AnalysisInputSchema.
 */
export function parseAnalysis(raw: string): Analysis {
  return AnalysisInputSchema.parse(JSON.parse(extractJsonObject(raw)));
}

/**
 * Drop or repair model refs that don't exist in the real diff so the UI never
 * shows "unknown hunk" for inventing ids. Applied at the payload boundary.
 */
export function bindAnalysis(analysis: Analysis, files: DiffFile[]): Analysis {
  const hunks = hunkById(files);

  const sections = analysis.sections.map((section) => ({
    ...section,
    snippets: section.snippets
      .filter((s) => hunks.has(s.hunk_id))
      .map((s) => {
        if (s.from == null || s.to == null) return s;
        const entry = hunks.get(s.hunk_id)!;
        if (hunkHasRange(entry.hunk, s.from, s.to)) return s;
        // Range misses the hunk — fall back to the whole hunk rather than blank UI.
        return { ...s, from: null, to: null };
      }),
  }));

  const findings = analysis.findings
    .filter((f) => hunks.has(f.hunk_id))
    .map((f) => {
      if (f.line == null) return f;
      const entry = hunks.get(f.hunk_id)!;
      if (hunkHasLine(entry.hunk, f.line)) return f;
      return { ...f, line: null };
    });

  return { ...analysis, sections, findings };
}
