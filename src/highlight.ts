import {
  createHighlighter,
  bundledLanguages,
  type BundledLanguage,
  type Highlighter,
  type ThemedToken,
} from "shiki";
import type { DiffFile, Hunk } from "./diff.ts";
import { CODE_THEME_NAME, neobrutalTheme } from "./code-theme.ts";
import { esc } from "./html.ts";

const LANG_BY_EXT: Record<string, BundledLanguage> = {
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", mjs: "javascript", cjs: "javascript",
  rb: "ruby", py: "python", go: "go", rs: "rust", java: "java", kt: "kotlin", swift: "swift",
  c: "c", h: "c", cc: "cpp", cpp: "cpp", hpp: "cpp", cs: "csharp", php: "php",
  sh: "shellscript", bash: "shellscript", zsh: "shellscript", fish: "fish",
  html: "html", erb: "erb", css: "css", scss: "scss", json: "json", yml: "yaml", yaml: "yaml",
  toml: "toml", md: "markdown", sql: "sql", ex: "elixir", exs: "elixir", vue: "vue", svelte: "svelte",
};

export function langFor(path: string): BundledLanguage | "text" {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const lang = LANG_BY_EXT[ext];
  return lang && lang in bundledLanguages ? lang : "text";
}

export { esc } from "./html.ts";

/** Single-theme tokens: color only (no dual-theme htmlStyle objects). */
function tokenStyle(token: Pick<ThemedToken, "color">): string {
  return token.color ? `color:${token.color}` : "";
}

export async function makeHighlighter(files: DiffFile[]): Promise<Highlighter> {
  const langs = [...new Set(files.map((f) => langFor(f.path)).filter((l): l is BundledLanguage => l !== "text"))];
  return createHighlighter({
    themes: [neobrutalTheme],
    langs,
  });
}

// One HTML string per hunk line: themed token spans, already escaped for
// direct innerHTML use.
export function highlightHunk(hl: Highlighter, file: DiffFile, hunk: Hunk): string[] {
  const code = hunk.lines.map((l) => l.text).join("\n");
  let tokenLines: Pick<ThemedToken, "content" | "color">[][];
  try {
    tokenLines = hl.codeToTokens(code, {
      lang: langFor(file.path),
      theme: CODE_THEME_NAME,
    }).tokens;
  } catch {
    tokenLines = hunk.lines.map((l) => [{ content: l.text }]);
  }
  return hunk.lines.map((line, i) => {
    const tokens = tokenLines[i] ?? [{ content: line.text }];
    return tokens.map((t) => `<span style="${esc(tokenStyle(t))}">${esc(t.content)}</span>`).join("");
  });
}
