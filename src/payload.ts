import { renderMermaidSVG } from "beautiful-mermaid";
import type { AnalysisResult } from "./analysis";
import type { DiffFile, DiffLine } from "./diff";
import { highlightHunk, makeHighlighter } from "./highlight";

// The single serializable object crossing the server/client boundary,
// embedded in the HTML shell as window.__REVIEW_DATA__ and consumed by the
// Svelte app in ui/.

export interface PayloadLine {
  kind: DiffLine["kind"];
  oldNo: number | null;
  newNo: number | null;
  text: string;
  html: string; // shiki dual-theme token spans, safe for innerHTML
}

export interface PayloadHunk {
  id: string;
  header: string;
  lines: PayloadLine[];
}

export interface PayloadFile {
  path: string;
  oldPath: string;
  status: DiffFile["status"];
  adds: number;
  dels: number;
  hunks: PayloadHunk[];
}

export interface PayloadResult {
  backend: string;
  analysis: AnalysisResult["analysis"];
  // Pre-rendered mermaid SVG, "" when the analysis has no diagram or the
  // source failed to render (the UI then falls back to showing the source).
  diagrams: { top: string; sections: string[] };
}

export interface ReviewPayload {
  version: 1;
  mode: "server" | "export";
  title: string;
  changeSummary: string;
  totalChangedLines: number;
  results: PayloadResult[];
  files: PayloadFile[];
}

function renderDiagram(source: string): string {
  if (!source.trim()) return "";
  try {
    return renderMermaidSVG(source, { transparent: true }).replace(/\s*@import url\([^;]+;?/g, "");
  } catch {
    return "";
  }
}

export async function buildReviewPayload(
  results: AnalysisResult[],
  files: DiffFile[],
  mode: ReviewPayload["mode"],
): Promise<ReviewPayload> {
  const hl = await makeHighlighter(files);

  const payloadFiles: PayloadFile[] = files.map((file) => ({
    path: file.path,
    oldPath: file.oldPath,
    status: file.status,
    adds: file.hunks.reduce((n, h) => n + h.lines.filter((l) => l.kind === "add").length, 0),
    dels: file.hunks.reduce((n, h) => n + h.lines.filter((l) => l.kind === "del").length, 0),
    hunks: file.hunks.map((hunk) => {
      const html = highlightHunk(hl, file, hunk);
      return {
        id: hunk.id,
        header: hunk.header,
        lines: hunk.lines.map((line, i) => ({ ...line, html: html[i] })),
      };
    }),
  }));

  const payloadResults: PayloadResult[] = results.map((r) => ({
    backend: r.backend,
    analysis: r.analysis,
    diagrams: {
      top: renderDiagram(r.analysis.diagram),
      sections: r.analysis.sections.map((s) => renderDiagram(s.diagram)),
    },
  }));

  const hunkCount = files.reduce((n, f) => n + f.hunks.length, 0);
  return {
    version: 1,
    mode,
    title: results[0].analysis.title,
    changeSummary: `${hunkCount} hunk${hunkCount === 1 ? "" : "s"} across ${files.length} file${files.length === 1 ? "" : "s"}`,
    totalChangedLines: payloadFiles.reduce((n, f) => n + f.adds + f.dels, 0),
    results: payloadResults,
    files: payloadFiles,
  };
}
