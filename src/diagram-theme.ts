import type { RenderOptions } from "beautiful-mermaid";

/**
 * Mermaid theme for the neobrutalist review UI.
 *
 * Color aliases (--d-*) are defined on `.diagram` in the UI so we never
 * write circular `--fg: var(--fg)` onto the SVG.
 *
 * Keep polish minimal: aggressive stroke/marker rewrites distorted
 * arrowheads and made edges look broken.
 */
export const DIAGRAM_RENDER_OPTIONS: RenderOptions = {
  transparent: true,
  bg: "var(--d-bg)",
  fg: "var(--d-fg)",
  line: "var(--d-line)",
  accent: "var(--d-accent)",
  muted: "var(--d-muted)",
  surface: "var(--d-surface)",
  border: "var(--d-border)",
  font: "IBM Plex Sans",
  padding: 24,
  nodeSpacing: 32,
  layerSpacing: 40,
  componentSpacing: 36,
};

/** Offline cleanup only — do not reshape markers or edge geometry. */
export function polishDiagramSvg(svg: string): string {
  return svg
    .replace(/\s*@import url\([^;]+;?/g, "")
    // Harder box strokes only (nodes/groups use 1; edges/markers use 0.75)
    .replace(/stroke-width="1"/g, 'stroke-width="1.75"');
}
