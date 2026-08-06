# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A CLI (`semantic-review`) that turns a git diff into a narrative HTML review app: an LLM backend analyzes the diff, a browser opens the report, a human comments, and the feedback prints to stdout as plaintext for the calling agent. Also ships an agent skill in `skills/semantic-review/`.

## Commands

```sh
bun test                      # run all tests
bun test test/diff.test.ts    # run one test file
bun test -t "name"            # run tests matching a name
npm run typecheck             # tsc --noEmit over src/
npm run check:ui              # svelte-check over ui/
npm run build                 # build:ui (vite → dist/ui) then build:cli (esbuild → dist/cli.js)
npm run dev:ui                # vite dev server for the UI with fixture data (ui/dev/data.ts)
bun run eval                  # score backends on fixture diffs in evals/cases (needs a backend/API key)
```

The UI smoke test (`test/ui-smoke.test.ts`) skips itself unless `dist/ui/` exists — run `npm run build:ui` first to include it.

## Architecture

The CLI is a pipeline; each `src/` module is one stage:

1. **`git.ts` / stdin → `diff.ts`** — get the diff, parse unified output into files and hunks with stable ids (`h1`, `h2`, …). `diffForModel` re-serializes it with line-number prefixes (`42|+code`) so the model can reference lines.
2. **`analysis.ts`** — the zod `AnalysisSchema` (sections, snippets, findings, notes, mermaid diagrams) and the prompt that asks for it. `AnalysisInputSchema` is the lenient variant for caller-provided JSON (`--analysis`).
3. **`backends.ts` + `harness.ts`** — two ways to run the analysis. API backends (`anthropic`, `openai`) call HTTP endpoints with structured-output JSON schemas. Harnesses (`claude`, `codex`, `gemini`, `pi`, `opencode`) shell out to installed agent CLIs as one-shot analyzers via `proc.ts`; each `HarnessDefinition` in `harness.ts` becomes a `Backend`. `--with` accepts several backends; the report shows one tab per result.
4. **`payload.ts`** — builds the single serializable object crossing the server/client boundary (`window.__REVIEW_DATA__`): Pierre SSR diffs (`pierre-render.ts`) and pre-rendered mermaid SVGs.
5. **`shell.ts`** — inlines payload, CSS, and the built Svelte bundle into one self-contained HTML document. Escapes `<` in the JSON to block `</script>` breakout; diff content is untrusted.
6. **`server.ts` or `export.ts`** — either serve the document on localhost and resolve when the reviewer POSTs `/done`, or write it to disk (`--export`) where the Done button copies feedback to the clipboard instead.
7. **`review.ts`** — formats the `ReviewResult` as plaintext for stdout. Deliberately platform-neutral (no node APIs) because the browser bundle imports it too.

`config.ts` loads user defaults from `~/.config/semantic-review/config.json`; CLI flags override them.

### UI (`ui/`)

Svelte 5 app (runes, `state.svelte.ts` holds a `ReviewState` class) built by vite as a single IIFE into `dist/ui/` — no module loading, no remote assets, because the export must work fully offline (the smoke test enforces this). The UI imports types and `formatReview` directly from `../src/`, so schema changes in `src/analysis.ts`, `src/payload.ts`, or `src/review.ts` reach both sides. `shell.ts` finds the built bundle next to `dist/cli.js` when packaged, or in `../dist/ui/` when running from `src/`.

### Evals (`evals/`)

`bun run eval` runs fixture diffs through a backend and scores the analysis structurally (valid hunk ids, line ranges, snippet length, etc.). Scores can't detect shallowness — a thin analysis passes every check — so browse the HTML written to `evals/out/` before trusting a number. `evals/README.md` records past results and known prompt-tuning targets.

## Notes

- Runtime deps are only `@pierre/diffs`, `beautiful-mermaid`, `zod`; the CLI bundles with `--packages=external`. Be reluctant to add dependencies. Pierre pulls Shiki for theming internally — do not reintroduce a direct app-level Shiki highlighter.
- Both `bun.lock` and `pnpm-lock.yaml` exist; tests and evals assume bun.
- Changing `AnalysisSchema` affects the API backends' JSON schemas, the harness prompt, `--analysis` input parsing, and the UI — check all four.
