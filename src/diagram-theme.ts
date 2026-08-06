import type { RenderOptions } from "beautiful-mermaid";

/**
 * Mermaid theme tuned to the neobrutalist review UI.
 *
 * beautiful-mermaid writes `--bg`, `--fg`, `--accent`, etc. onto the SVG.
 * Our app already uses those same names, so we must not pass `var(--fg)`
 * (that becomes `--fg: var(--fg)` — a cycle). Instead we point at non-
 * colliding aliases set on `.diagram` in the UI CSS, which themselves
 * resolve to the real design tokens. Light/dark then follows the page.
 */
export const DIAGRAM_RENDER_OPTIONS: RenderOptions = {
  transparent: true,
  // Aliases live on `.diagram` (ui/src/components/Diagram.svelte)
  bg: "var(--d-bg)",
  fg: "var(--d-fg)",
  line: "var(--d-line)",
  accent: "var(--d-accent)",
  muted: "var(--d-muted)",
  surface: "var(--d-surface)",
  border: "var(--d-border)",
  // Embedded @import is stripped; page already ships IBM Plex Sans.
  font: "IBM Plex Sans",
  padding: 28,
  nodeSpacing: 28,
  layerSpacing: 44,
};

/** Drop remote font imports (export must stay offline) and harden strokes. */
export function polishDiagramSvg(svg: string): string {
  return (
    svg
      // Offline: no Google Fonts. Page fonts cover labels.
      .replace(/\s*@import url\([^;]+;?/g, "")
      // Neobrutal: thicker box strokes (was 0.75 / 1)
      .replace(/stroke-width="0\.75"/g, 'stroke-width="1.75"')
      .replace(/stroke-width="1"/g, 'stroke-width="2"')
      // Arrow heads read clearer a touch larger
      .replace(/stroke-linejoin="round"/g, 'stroke-linejoin="miter"')
  );
}
