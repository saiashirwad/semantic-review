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

  // Code surface — warm espresso ink, warm paper foreground (always dark)
  codeBg: "#171512",
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
   * Syntax roles — four-role logic, two warm + two cool, from the UI's hues:
   *   control  = brand orange (keywords / storage)
   *   callable = gold (functions; sev-minor family)
   *   literal  = soft mint (strings AND numbers — values read as one family)
   *   type     = soft sky (sev-info family)
   *   property = warm cream (near fg, slightly dimmer)
   * No purple, no teal; escapes go gold so they pop inside mint strings.
   */
  keyword: "#ff6a2b",
  string: "#86c7a2",
  function: "#f0c14a",
  type: "#7cc0ee",
  number: "#86c7a2",
  property: "#d9d2c2",
  tag: "#ff8450",
  regex: "#e78f8f",
  escape: "#f0c14a",
  support: "#7cc0ee",
  invalid: "#ff5c5c",
  component: "#7cc0ee",

  // Diff — quiet row washes, bright markers (tokens stay on top)
  addBg: "#152a1e",
  delBg: "#2b1613",
  addFg: "#34d399",
  delFg: "#fb7185",
  addRow: "#1c231b",
  delRow: "#271916",

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
