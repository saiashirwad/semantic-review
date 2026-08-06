# Changelog

## Unreleased

## 0.4.0 - 2026-08-06

### Added

- Interactive review UI (Svelte): sidebar walkthrough navigation, unified/split diff views, per-file and per-hunk viewed tracking with progress counters, expandable excerpts, and anchored comment composer with syntax-highlighted quotes.
- Structured findings: analyses now report concrete defects with severity (`critical`/`major`/`minor`/`info`), file:line anchors, and recommendations. Findings appear in a rail and as inline flags on the diff; each can be jumped to, resolved, or added to the review as a comment. Older analysis JSON without `findings` still parses.
- `opencode` harness backend (`--with opencode`, models as `provider/model`).
- Harness registry (`src/harness.ts`): agent CLI backends are declared as data (`HarnessDefinition`), so help text and availability checks derive from one place.

### Changed

- The report is fully self-contained in both server and export mode: no Tailwind or mermaid CDNs; mermaid diagrams are pre-rendered to SVG server-side.
- Exported reports bundle `formatReview` via the app bundle instead of injecting its source text.

### Removed

- The TL;DR / Walkthrough / Full-diff brevity toggle; the layout now shows the summary, sections, and a collapsed full diff on one page.

## 0.3.0 - 2026-08-06

### Added

- User preferences in `~/.config/semantic-review/config.json`, including default backend, model, and effort settings.
- OpenAI Responses API support alongside Anthropic and the existing CLI backends.
- Self-contained HTML exports with review comments and clipboard feedback when the reviewer clicks **Done**.

### Changed

- Anthropic API requests now use native HTTP instead of the Anthropic SDK.
