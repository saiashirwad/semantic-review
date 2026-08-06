/**
 * Pierre (@pierre/diffs) SSR: syntax-highlighted, word-level diffs for the
 * offline report. Rendering runs in the CLI so the browser bundle stays small;
 * the UI hydrates light-DOM HTML and layers our review interactions on top.
 */
import {
  parsePatchFiles,
  registerCustomTheme,
  type DiffLineAnnotation,
  type FileDiffMetadata,
} from "@pierre/diffs";
import { preloadDiffHTML } from "@pierre/diffs/ssr";
import { neobrutalTheme, CODE_THEME_NAME } from "./code-theme.ts";
import type { DiffFile, Hunk } from "./diff.ts";

let themeRegistered = false;

function ensureTheme() {
  if (themeRegistered) return;
  registerCustomTheme(CODE_THEME_NAME, async () => neobrutalTheme as never);
  themeRegistered = true;
}

/** Rebuild a unified patch from parsed files (preserves hunk headers / line nos). */
export function filesToPatch(files: DiffFile[]): string {
  return files.map(fileToPatch).join("");
}

export function fileToPatch(file: DiffFile): string {
  if (file.status === "binary") return "";
  const oldName = file.oldPath || file.path;
  const newName = file.path;
  const lines: string[] = [`diff --git a/${oldName} b/${newName}`];
  if (file.status === "added") {
    lines.push("new file mode 100644", "--- /dev/null", `+++ b/${newName}`);
  } else if (file.status === "deleted") {
    lines.push("deleted file mode 100644", `--- a/${oldName}`, "+++ /dev/null");
  } else {
    if (file.status === "renamed") lines.push(`rename from ${oldName}`, `rename to ${newName}`);
    lines.push(`--- a/${oldName}`, `+++ b/${newName}`);
  }
  for (const hunk of file.hunks) {
    lines.push(hunk.header);
    for (const line of hunk.lines) {
      const prefix = line.kind === "add" ? "+" : line.kind === "del" ? "-" : " ";
      lines.push(prefix + line.text);
    }
  }
  return lines.join("\n") + "\n";
}

export function hunkToPatch(file: DiffFile, hunk: Hunk): string {
  const slim: DiffFile = { ...file, hunks: [hunk] };
  return fileToPatch(slim);
}

const BASE_OPTIONS = {
  themeType: "dark" as const,
  theme: CODE_THEME_NAME,
  disableFileHeader: true,
  lineDiffType: "word-alt" as const,
  diffIndicators: "classic" as const,
  overflow: "wrap" as const,
  hunkSeparators: "line-info-basic" as const,
  expandUnchanged: false,
  stickyHeader: false,
};

/**
 * Pierre's core CSS is authored for Shadow DOM (`:host`). We mount light-DOM
 * under `.pierre-host`, so rewrite host selectors to that class.
 */
export function adaptPierreCssForLightDom(css: string): string {
  return css
    .replace(/:host\b/g, ".pierre-host")
    // Nested CSS under :host sometimes left empty @layer theme blocks; fine.
    .replace(/\.pierre-host\(([^)]*)\)/g, ".pierre-host:is($1)"); // :host(.x) → .pierre-host:is(.x)
}

function stripChrome(html: string): { body: string; styles: string[] } {
  const styles: string[] = [];
  const withoutSvg = html.replace(/<svg[\s\S]*?<\/svg>/g, "");
  const body = withoutSvg.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (_m, css: string) => {
    styles.push(adaptPierreCssForLightDom(css));
    return "";
  });
  return { body: body.trim(), styles };
}

export interface PierreRendered {
  /** Shared core + theme CSS (inject once per document). */
  css: string;
  /** Unified HTML body per file path. */
  filesUnified: Record<string, string>;
  /** Split HTML body per file path. */
  filesSplit: Record<string, string>;
  /** Unified HTML body per hunk id (section snippets). */
  hunksUnified: Record<string, string>;
  /** Split HTML body per hunk id. */
  hunksSplit: Record<string, string>;
}

async function renderMeta(
  meta: FileDiffMetadata,
  diffStyle: "unified" | "split",
  annotations?: DiffLineAnnotation<{ key: string }>[],
): Promise<string> {
  ensureTheme();
  return preloadDiffHTML({
    fileDiff: meta,
    annotations,
    options: {
      ...BASE_OPTIONS,
      diffStyle,
    },
  });
}

/**
 * Pre-render every file and hunk with Pierre. Dedupes CSS across surfaces.
 * Failures fall back to empty strings so the UI can keep the legacy table view.
 */
export async function renderPierreDiffs(files: DiffFile[]): Promise<PierreRendered> {
  ensureTheme();
  const styleSet = new Set<string>();
  const filesUnified: Record<string, string> = {};
  const filesSplit: Record<string, string> = {};
  const hunksUnified: Record<string, string> = {};
  const hunksSplit: Record<string, string> = {};

  const collect = (html: string): string => {
    const { body, styles } = stripChrome(html);
    for (const s of styles) styleSet.add(s);
    return body;
  };

  for (const file of files) {
    if (file.status === "binary" || file.hunks.length === 0) continue;
    try {
      const patch = fileToPatch(file);
      const parsed = parsePatchFiles(patch, `file-${file.path}`);
      const meta = parsed[0]?.files[0];
      if (!meta) continue;
      filesUnified[file.path] = collect(await renderMeta(meta, "unified"));
      filesSplit[file.path] = collect(await renderMeta(meta, "split"));
    } catch {
      // leave empty — UI falls back
    }

    for (const hunk of file.hunks) {
      try {
        const patch = hunkToPatch(file, hunk);
        const parsed = parsePatchFiles(patch, `hunk-${hunk.id}`);
        const meta = parsed[0]?.files[0];
        if (!meta) continue;
        hunksUnified[hunk.id] = collect(await renderMeta(meta, "unified"));
        hunksSplit[hunk.id] = collect(await renderMeta(meta, "split"));
      } catch {
        // leave empty
      }
    }
  }

  return {
    css: [...styleSet].join("\n"),
    filesUnified,
    filesSplit,
    hunksUnified,
    hunksSplit,
  };
}
