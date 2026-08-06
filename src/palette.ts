/**
 * Single neobrutalist palette for code highlighting, diagram accents, and UI.
 * `ui/src/app.css` :root tokens must stay in lockstep with these values.
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

  // Code surface (always dark — light paper UI, dark diffs)
  codeBg: "#111111",
  codeFg: "#f2ede4",
  codeMuted: "#a39a8c",
  codeFaint: "#6f6a5e",
  codePunct: "#8f887c",
  codeLine: "#5c564c",

  // Brand / accent
  accent: "#f54e00",
  accentHover: "#c73f00",
  accentSoft: "#ffdcc8",
  selection: "#c45a32",

  // Syntax roles (dark code on #111)
  keyword: "#ff5e3a",
  string: "#6fd3c0",
  function: "#f0c040",
  type: "#a78bfa",
  number: "#ffab70",
  property: "#e8d5b7",
  tag: "#4ade80",
  regex: "#fb7185",
  escape: "#c4a5f0",
  support: "#8bb4f0",
  invalid: "#ff6b6b",
  component: "#6fd3c0",

  // Diff
  addBg: "#0c2418",
  delBg: "#2a1010",
  addFg: "#3dd68c",
  delFg: "#ff6b6b",
  addRow: "#0f1f16",
  delRow: "#241212",

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
