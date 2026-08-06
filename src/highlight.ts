import { createHighlighter, bundledLanguages, type Highlighter } from "shiki";
import type { DiffFile, Hunk } from "./diff";
import { CODE_THEME_NAME, neobrutalTheme } from "./code-theme";

const LANG_BY_EXT: Record<string, string> = {
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", mjs: "javascript", cjs: "javascript",
  rb: "ruby", py: "python", go: "go", rs: "rust", java: "java", kt: "kotlin", swift: "swift",
  c: "c", h: "c", cc: "cpp", cpp: "cpp", hpp: "cpp", cs: "csharp", php: "php",
  sh: "shellscript", bash: "shellscript", zsh: "shellscript", fish: "fish",
  html: "html", erb: "erb", css: "css", scss: "scss", json: "json", yml: "yaml", yaml: "yaml",
  toml: "toml", md: "markdown", sql: "sql", ex: "elixir", exs: "elixir", vue: "vue", svelte: "svelte",
};

// Custom neobrutalist theme — dark code on warm paper UI (see code-theme.ts).
export const CODE_THEME = CODE_THEME_NAME;

export function langFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const lang = LANG_BY_EXT[ext];
  return lang && lang in bundledLanguages ? lang : "text";
}

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function tokenStyle(token: { htmlStyle?: string | Record<string, string>; color?: string }): string {
  if (token.htmlStyle) {
    if (typeof token.htmlStyle === "string") return token.htmlStyle;
    return Object.entries(token.htmlStyle)
      .map(([k, v]) => `${k}:${v}`)
      .join(";");
  }
  return token.color ? `color:${token.color}` : "";
}

export async function makeHighlighter(files: DiffFile[]): Promise<Highlighter> {
  const langs = [...new Set(files.map((f) => langFor(f.path)).filter((l) => l !== "text"))];
  return createHighlighter({
    themes: [neobrutalTheme],
    langs,
  });
}

// One HTML string per hunk line: themed token spans, already escaped for
// direct innerHTML use.
export function highlightHunk(hl: Highlighter, file: DiffFile, hunk: Hunk): string[] {
  const code = hunk.lines.map((l) => l.text).join("\n");
  let tokenLines: { htmlStyle?: string | Record<string, string>; color?: string; content: string }[][];
  try {
    tokenLines = hl.codeToTokens(code, {
      lang: langFor(file.path) as never,
      theme: CODE_THEME,
    }).tokens;
  } catch {
    tokenLines = hunk.lines.map((l) => [{ content: l.text }]);
  }
  return hunk.lines.map((line, i) => {
    const tokens = tokenLines[i] ?? [{ content: line.text }];
    return tokens.map((t) => `<span style="${esc(tokenStyle(t))}">${esc(t.content)}</span>`).join("");
  });
}
