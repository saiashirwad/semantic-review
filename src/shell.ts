import { readFile } from "node:fs/promises";
import { esc } from "./highlight";
import type { ReviewPayload } from "./payload";

export interface UiAssets {
  js: string;
  css: string;
}

// Reads the built Svelte bundle from dist/ui/, which lives next to the built
// dist/cli.js in the published package. The ../dist/ui fallback covers
// running unbundled from src/ (tests, evals).
export async function loadUiAssets(): Promise<UiAssets> {
  for (const dir of ["./ui/", "../dist/ui/"]) {
    try {
      const [js, css] = await Promise.all([
        readFile(new URL(`${dir}app.js`, import.meta.url), "utf8"),
        readFile(new URL(`${dir}style.css`, import.meta.url), "utf8"),
      ]);
      return { js, css };
    } catch {
      // Try the next location.
    }
  }
  throw new Error("UI assets not found next to the CLI; run `npm run build` (or `npm run build:ui`) first");
}

// One fully self-contained HTML document: styles, payload, and app inlined.
// Served as the single GET / response and written verbatim by --export.
export function renderShell(payload: ReviewPayload, assets: UiAssets): string {
  // <-escaping prevents "</script>" (and "<!--") breakout from diff
  // content, which is untrusted input.
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  const js = assets.js.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(payload.title)} — semantic-review</title>
<style>
${assets.css}
</style>
</head>
<body>
<div id="app"></div>
<script>window.__REVIEW_DATA__ = ${json};</script>
<script>
${js}
</script>
</body>
</html>`;
}
