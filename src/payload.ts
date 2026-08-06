import { renderMermaidSVG } from "beautiful-mermaid";
import { bindAnalysis, type AnalysisResult } from "./analysis.ts";
import type { DiffFile, DiffLine } from "./diff.ts";
import { summarizeChange } from "./diff.ts";
import { DIAGRAM_RENDER_OPTIONS, polishDiagramSvg } from "./diagram-theme.ts";
import { highlightHunk, makeHighlighter } from "./highlight.ts";
import { renderPierreDiffs, type PierreRendered } from "./pierre-render.ts";

// The single serializable object crossing the server/client boundary,
// embedded in the HTML shell as window.__REVIEW_DATA__ and consumed by the
// Svelte app in ui/.

export type PayloadLine = DiffLine & {
  html: string; // shiki token spans, safe for innerHTML (quotes / composer)
};

export interface PayloadHunk {
  id: string;
  header: string;
  lines: PayloadLine[];
  /** Pierre SSR bodies (no shared CSS — see ReviewPayload.pierre.css). */
  pierre?: { unified: string; split: string };
}

export interface PayloadFile {
  path: string;
  oldPath: string;
  status: DiffFile["status"];
  adds: number;
  dels: number;
  hunks: PayloadHunk[];
  /** Full-file Pierre SSR (all hunks). Prefer this in Full diff. */
  pierre?: { unified: string; split: string };
}

export interface PayloadResult {
  backend: string;
  analysis: AnalysisResult["analysis"];
  // Pre-rendered mermaid SVG, "" when the analysis has no diagram or the
  // source failed to render (the UI then falls back to showing the source).
  diagrams: { top: string; sections: string[] };
}

/** Pierre shared assets for offline light-DOM mounts. */
export interface PierrePayload {
  css: string;
}

export interface ReviewPayload {
  version: 1;
  mode: "server" | "export";
  title: string;
  changeSummary: string;
  totalChangedLines: number;
  results: PayloadResult[];
  files: PayloadFile[];
  pierre?: PierrePayload;
}

function renderDiagram(source: string): string {
  if (!source.trim()) return "";
  try {
    return polishDiagramSvg(renderMermaidSVG(source, DIAGRAM_RENDER_OPTIONS));
  } catch {
    return "";
  }
}

function attachPierre(files: PayloadFile[], rendered: PierreRendered): PayloadFile[] {
  return files.map((file) => ({
    ...file,
    pierre:
      rendered.filesUnified[file.path] || rendered.filesSplit[file.path]
        ? {
            unified: rendered.filesUnified[file.path] ?? "",
            split: rendered.filesSplit[file.path] ?? "",
          }
        : undefined,
    hunks: file.hunks.map((hunk) => ({
      ...hunk,
      pierre:
        rendered.hunksUnified[hunk.id] || rendered.hunksSplit[hunk.id]
          ? {
              unified: rendered.hunksUnified[hunk.id] ?? "",
              split: rendered.hunksSplit[hunk.id] ?? "",
            }
          : undefined,
    })),
  }));
}

export async function buildReviewPayload(
  results: AnalysisResult[],
  files: DiffFile[],
  mode: ReviewPayload["mode"],
): Promise<ReviewPayload> {
  // Bind once at the shell boundary so every entry path (CLI, evals HTML,
  // --analysis, vite fixture) drops invented hunk ids before the UI sees them.
  const bound = results.map((r) => ({
    backend: r.backend,
    analysis: bindAnalysis(r.analysis, files),
  }));

  const [hl, pierre] = await Promise.all([makeHighlighter(files), renderPierreDiffs(files)]);

  const payloadFiles: PayloadFile[] = attachPierre(
    files.map((file) => ({
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
    })),
    pierre,
  );

  const payloadResults: PayloadResult[] = bound.map((r) => ({
    backend: r.backend,
    analysis: r.analysis,
    diagrams: {
      top: renderDiagram(r.analysis.diagram),
      sections: r.analysis.sections.map((s) => renderDiagram(s.diagram)),
    },
  }));

  return {
    version: 1,
    mode,
    title: bound[0].analysis.title,
    changeSummary: summarizeChange(files),
    totalChangedLines: payloadFiles.reduce((n, f) => n + f.adds + f.dels, 0),
    results: payloadResults,
    files: payloadFiles,
    pierre: pierre.css ? { css: pierre.css } : undefined,
  };
}
