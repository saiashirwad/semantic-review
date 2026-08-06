/**
 * Single neobrutalist palette for code highlighting, diagram accents, and UI.
 * `ui/src/app.css` :root tokens must stay in lockstep with these values.
 *
 * Code colors are poster-bright on pure ink — high contrast, distinct roles,
 * readable on both add-green and del-red row washes.
 */
export const palette = {
  // Paper UI (light)
  paper: "#f3f0e8",
  raised: "#ffffff",
  panel: "#fff8ec",
  inset: "#e8e2d6",
  ink: "#0a0a0a",
  inkMuted: "#2e2e2e",
  inkFaint: "#5c5c5c",

  // Code surface — pure ink, warm paper foreground (always dark)
  codeBg: "#0c0c0c",
  codeFg: "#f7f1e6",
  codeMuted: "#a8a194",
  codeFaint: "#7a7368",
  codePunct: "#8a8378",
  codeLine: "#5c564c",

  // Brand / accent
  accent: "#f54e00",
  accentHover: "#c73f00",
  accentSoft: "#ffdcc8",
  selection: "#c45a32",

  /*
   * Syntax roles — saturated, high-luminance, separated by hue:
   *   keyword  = brand coral (control / storage)
   *   string   = mint (not the same green as +diff)
   *   function = gold
   *   type     = sky (not purple — purple dies on green add-rows)
   *   number   = peach
   *   property = warm cream (near fg, slightly dimmer)
   */
  keyword: "#ff5c2b",
  string: "#5eead4",
  function: "#fbbf24",
  type: "#7dd3fc",
  number: "#fdba74",
  property: "#e7dcc8",
  tag: "#4ade80",
  regex: "#fb7185",
  escape: "#d8b4fe",
  support: "#93c5fd",
  invalid: "#ff5c5c",
  component: "#2dd4bf",

  // Diff — quiet row washes, bright markers (tokens stay on top)
  addBg: "#082016",
  delBg: "#220e0e",
  addFg: "#34d399",
  delFg: "#fb7185",
  addRow: "#0a1812",
  delRow: "#180e0e",

  // Severity
  sevCritical: "#e03131",
  sevMajor: "#f54e00",
  sevMinor: "#c99200",
  sevInfo: "#1c7ed6",

  // Diagram card (light)
  diagramBg: "#faf8f4",
  diagramLine: "#9a948a",
  diagramBorder: "#2a2a2a",
} as const;

export type Palette = typeof palette;
