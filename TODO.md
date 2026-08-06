# UI Master Plan — brutalist polish pass

Eleven changes that take the review UI from "good brutalist app" to signature-grade.
Ordered by payoff. Three small ones are already applied (checked below).

## Ground rules (read before touching anything)

- **Where things live.** All UI code is in `ui/src/`. Design tokens are CSS custom
  properties in `ui/src/app.css` (light in `:root`, dark in the
  `@media (prefers-color-scheme: dark)` block). Client state is one class,
  `ReviewState`, in `ui/src/state.svelte.ts`, reached from any component via
  `getReviewState()`. This is Svelte 5 — use runes (`$state`, `$derived`, `$effect`,
  `$props`), not Svelte 4 stores.
- **No new dependencies. No external assets.** The app builds to a single offline
  IIFE (`dist/ui/`); everything must be inline CSS/JS. No CDN fonts, no animation
  libraries, no icon packs. The smoke test enforces offline.
- **New colors must mirror `src/palette.ts`.** Prefer existing tokens
  (`--accent`, `--sev-*`, `--fg`, `--border`, `--shadow-*`). If you truly need a new
  color, add it to `src/palette.ts` first, then mirror the hex in `app.css` (both
  light and dark blocks) with a `/* palette.xxx */` comment, matching the existing style.
- **Motion language.** Hard and mechanical. Durations 80–350ms. Cuts between held
  keyframe stops (see `jump-flash` in `app.css` for the pattern) or sharp cubics
  like `cubic-bezier(0.2, 0.9, 0.25, 1)`. Never a bare opacity fade. Every
  animation gets a `@media (prefers-reduced-motion: reduce)` fallback (none, or a
  plain fade).
- **Dark mode.** Every visual change must be checked in both themes. Hard offset
  shadows are black in light mode, white in dark (`--shadow-card` etc. handle this —
  use the tokens, never hardcode `#0a0a0a` shadows).
- **Injected DOM needs `:global()`.** Pierre diff markup and mermaid SVGs are not
  compiled by Svelte; styling them from a component requires
  `.wrapper :global(selector)`. Never write an unlayered bare `code {}` or table
  rule — it would beat Pierre's `@layer` styles and break diff layout (see the
  warning comment in `app.css` around line 333).
- **Verify after every item:** `npm run check:ui` (svelte-check must stay clean),
  then eyeball in the browser with `npm run dev:ui` (fixture data, hot reload).
  Before finishing a session: `npm run build && bun test`.

---

## 1. Press physics on every interactive element

**Goal:** the hard offset shadow becomes mechanical. Hover lifts the element off the
page; press pushes it *into* the page (element translates toward the shadow, shadow
collapses to zero). The app should feel like a machine with real buttons.

- [x] Add two utility patterns to `ui/src/app.css` (as documented classes or a
  commented recipe — components use scoped styles, so you will mostly copy the
  pattern per component):
  - **Shadowed elements** (anything with `--shadow-btn`/`--shadow-card`/`--shadow-pop`):
    ```css
    transition: transform 80ms cubic-bezier(0.2, 0, 0, 1),
                box-shadow 80ms cubic-bezier(0.2, 0, 0, 1);
    /* :hover */ transform: translate(-1px, -1px); box-shadow: 5px 5px 0 var(--border); /* base + 1px */
    /* :active */ transform: translate(2px, 2px); box-shadow: 0 0 0 var(--border);
    ```
    Hover shadow = base offset + 1px (a 2px `--shadow-btn` becomes `3px 3px 0`).
  - **Flat grouped buttons** (chips/toggles/tabs living inside a bordered group with
    no own shadow): no hover lift, just `:active { transform: translate(1px, 1px); }`.
- [x] Apply the shadowed pattern to: `ProgressHeader.svelte` `.done` (already close —
  align its timings/transition with the utility), `SelectionBubble.svelte`,
  `CommentComposer.svelte` buttons, `FindingPopover.svelte` action buttons,
  `FloatingChrome.svelte`, `OverallBox.svelte` buttons, `Finished.svelte` `.check`.
- [x] Apply the flat pattern to: `ProgressHeader.svelte` `.rail-chip`, `.toggle button`,
  `.tabs button`; `Sidebar.svelte` walk items; `FilesRail.svelte` rows;
  `BugsRail.svelte` section headers and `FindingCard.svelte` `.body` / `.undo`.
- [x] Wrap all transforms in `@media (prefers-reduced-motion: reduce) { transform: none; }`
  (background/color changes may stay).
- [x] Acceptance: click-hold any button — it visibly sinks and its shadow vanishes;
  release — it springs back in under 100ms. Nothing shifts layout (transform only).
  Check both themes.

## 2. The countdown is the game loop

The reviewer's progress (`review.linesLeft`, `review.viewedHunks`) must feel like a
game ticking toward zero. Three parts; the third is done.

- [x] **Odometer digits on "lines left".** New component `ui/src/components/Odometer.svelte`:
  - Props: `{ value: number }`. Render `String(value)` (no locale separators) as one
    fixed-height slot per digit: outer span `display: inline-flex; overflow: hidden;
    height: 1em; line-height: 1em;` in `--font-code` with `font-variant-numeric: tabular-nums`.
  - Each slot contains a vertical column of the digits 0–9 (ten spans stacked), shifted
    with `transform: translateY(calc(-1em * digit)); transition: transform 160ms
    cubic-bezier(0.3, 0.9, 0.3, 1);` so a change *rolls* to the new digit.
  - When the digit count shrinks (1000 → 998 has same count; 100 → 99 loses one),
    keyed `{#each}` over slots; a removed slot may just disappear — acceptable.
  - Reduced motion: `transition: none`.
  - Use it in `ProgressHeader.svelte`: replace `<b>{review.linesLeft.toLocaleString()}</b>`
    with `<b><Odometer value={review.linesLeft} /></b>`.
  - Acceptance: open Files rail, mark a hunk viewed — the counter's digits roll down
    instead of swapping.
- [x] **Segmented file progress bar.** One hard segment per file, filling solid as each
  file is fully viewed. In `ProgressHeader.svelte` (so it lives under the sticky
  header): a full-width strip at the header's bottom edge, `height: 6px;
  border-top: var(--border-w) solid var(--border);` containing
  `display: grid; grid-template-columns: repeat(fileCount, 1fr);`.
  - Each cell: `border-right: 1px solid var(--border); background: transparent;`
    → `background: var(--fg)` when `review.fileViewed(file)`. No transition — a hard
    cut is correct here. Last cell drops the border.
  - Make each cell a `<button>` with `title={file.path}` and
    `onclick={() => review.jumpToFile(file.path)}`.
  - The header height is measured by a `ResizeObserver` (`--header-h`) so the extra
    6px is picked up automatically — verify sticky offsets still look right.
  - Acceptance: marking all hunks of a file viewed fills exactly one segment; clicking
    a segment scrolls to that file's full diff.
- [x] **DONE arms at zero.** *(applied — `ProgressHeader.svelte`: `.done.armed` flips to
  accent with a one-blink `done-arm` keyframe when `review.linesLeft === 0`.)*

## 3. Stamp semantics for dispositions

**Goal:** resolving/sending a finding slams a rotated rubber stamp on it; finishing
the review slams a giant one. This is the emotional payoff arc.

- [x] **Shared stamp look.** Component `ui/src/components/Stamp.svelte`:
  props `{ label: string, color?: string }` (color defaults to `var(--selected)`).
  Uppercase, `--font-label`, `font-weight: 700; letter-spacing: 0.12em;`,
  `border: 3px solid currentColor; padding: 2px 10px;`, `color` from prop,
  `transform: rotate(-8deg);`, transparent background. Entrance animation `stamp-in`:
  `from { transform: rotate(-8deg) scale(1.6); opacity: 0 }` →
  `60% { transform: rotate(-8deg) scale(0.94); opacity: 1 }` →
  `to { transform: rotate(-8deg) scale(1) }`, 160ms, `cubic-bezier(0.2, 1.2, 0.3, 1)`.
  Reduced motion: no animation.
- [x] **FindingCard** (`ui/src/components/FindingCard.svelte`): when
  `disposition != null`, overlay a centered absolutely-positioned `<Stamp>` across
  the card (`RESOLVED` in `var(--selected)`, `SENT →` in `var(--accent)`), and give
  the card a diagonal hatch:
  `background: repeating-linear-gradient(45deg, transparent 0 6px, color-mix(in srgb, var(--fg) 7%, transparent) 6px 8px);`.
  Keep the existing `.status` row with Undo below (drop the old `.state-tag` if the
  stamp replaces it). Card needs `position: relative`. The stamp must not block the
  Undo click (`pointer-events: none`).
- [x] **Impact shake.** When a stamp lands, the card container plays one 90ms shake:
  `@keyframes stamp-shake { 0% { transform: translate(0) } 40% { transform: translate(2px, 1px) } 100% { transform: translate(0) } }`.
  Trigger by keying the overlay on the disposition so it remounts. Reduced motion: none.
- [x] **Finished screen** (`ui/src/components/Finished.svelte`): keep the panel, but the
  hero is a giant stamp — `REVIEW SENT` (or `REVIEW COPIED` in export mode),
  ~40px, rotated, in `var(--selected)`, slamming in ~250ms after the panel pops
  (`animation-delay`), with a 2px shake on the *panel* timed to the impact
  (`animation-delay` on a second animation). Replace the small `.check` square or
  keep it as a sub-element — designer's choice, stamp dominates.
- [x] Acceptance: resolve a finding in the rail — stamp slams, card hatches, undo
  still works and cleanly restores the card. Finish a review — the stamp moment
  reads as a screenshot-worthy payoff. Both themes.

## 4. Severity ruler (brutalist minimap)

**Goal:** a 12px vertical strip at the right edge of the main column mapping the whole
document: a severity-colored tick per open finding, a black tick per comment, and a
viewport window. Click to jump.

- [x] New component `ui/src/components/SeverityRuler.svelte`. Mount it in
  `App.svelte`'s `.layout` between `<main>` and `<BugsRail />`, wide mode only
  (`{#if !review.narrow}`).
- [x] Layout: add a `12px` grid column between the main and review columns in every
  wide `grid-template-columns` variant in `App.svelte` (there are four — the base
  and the `.no-left` / `.no-review` combinations; narrow stays untouched).
  The ruler itself: `position: sticky; top: var(--header-h);
  height: calc(100vh - var(--header-h)); border-left: var(--border-w) solid var(--border);
  background: var(--bg-inset);`.
- [x] Tick positions: an `$effect` that (re)computes after `tick()` whenever
  `review.findingsIndex` or `review.comments` change: for each open finding, locate
  `document.querySelector('[data-finding-anchor="…"]')` (build the selector with
  `findingAnchorId(finding)` from `state.svelte.ts` and `CSS.escape`), take
  `getBoundingClientRect().top + window.scrollY`, divide by
  `document.documentElement.scrollHeight` → percent. Same for comments via their
  `jump` targets (`[data-hunk][data-idx]`). Also recompute on window `resize` and on a
  600ms interval fallback (details elements opening changes offsets; cheap at this scale).
- [x] Render ticks: `position: absolute; left: 0; right: 0; height: 3px;
  top: {pct}%; background: var(--sev-critical|major|minor|info)` (comments:
  `var(--fg)`, 2px). Each tick is a `<button>` calling `review.jumpToFinding(key)` /
  `review.jumpToComment(comment)`; give it an accessible `aria-label` from the
  finding title.
- [x] Viewport window: a `2px`-bordered translucent box
  (`top = scrollY/scrollHeight`, `height = innerHeight/scrollHeight`), updated in a
  passive scroll listener behind `requestAnimationFrame`. Clicking empty track
  scrolls to that fraction of the document.
- [x] Acceptance: ruler ticks line up with findings (spot-check by clicking three);
  scrolling moves the window; resolving a finding removes its tick.

## 5. Masthead typography

**Goal:** the report opens like a newspaper front page; the sticky header title only
takes over once you scroll past.

- [x] In `App.svelte` `<main>`, before the `.tldr` card: a masthead block —
  `<h1>{payload.title}</h1>` at ~34px, weight 700, `letter-spacing: -0.02em`,
  `line-height: 1.1`, below it a double rule (`border-bottom: 4px solid var(--border);`
  plus a second `2px` rule with `3px` gap — two stacked divs), then a stats line in
  `--font-code` `--fs-sm` tabular: `+{added} −{removed} · {files} files · {hunks} hunks`.
  Compute added/removed once in `ReviewState` (getter counting
  `hunk.lines.filter(l => l.kind === "add" | "del")` — check the actual `kind`
  strings in `src/payload.ts` first; the existing `linesLeft` getter shows the shape).
- [x] Keep `payload.changeSummary` where it is; the masthead stats replace nothing.
- [x] Sticky handoff: `IntersectionObserver` on the masthead; while it is visible add
  a class to the header (via `ReviewState` flag, e.g. `mastheadVisible = $state(true)`)
  that hides the header `<h1>` (`visibility: hidden` or slide it up 4px with a 120ms
  cut — no fade). The brand square stays. When the masthead scrolls out, the header
  title snaps in.
- [x] Oversized section numerals: in `SectionCard.svelte` (read it first), render the
  index as `01`, `02`… at ~40px with outline stroke:
  `-webkit-text-stroke: 2px var(--fg); color: transparent; font-weight: 700;`
  (fallback for non-WebKit: solid `var(--fg)` via `@supports not (-webkit-text-stroke: 1px black)`).
- [x] Acceptance: page opens with a commanding title block; scrolling past it pops the
  title into the sticky header with no double-title moment; section numbers read as
  outline type in both themes.

## 6. Load choreography

**Goal:** the report assembles itself in under 600ms on first load. Movement on axes,
shadows landing after their cards — never fade-only.

- [x] Write the sequence as a storyboard comment at the top of `App.svelte`'s style
  block, then implement it exactly:
  ```
  /* ─── LOAD STORYBOARD ─────────────────────────────
   *   0ms  header slides down from -100% (200ms)
   * 120ms  summary card snaps up 12px → 0 (240ms)
   * 160ms  card's shadow lands (box-shadow 0 → 4px 4px, 120ms)
   * 200ms+ sections cascade, 50ms stagger (max 8 staggered, rest instant)
   * 250ms+ review-rail cards cascade, 40ms stagger
   * ────────────────────────────────────────────────── */
  ```
- [x] Gate everything on a one-shot `boot` class: `App.svelte` puts `class="boot"` on
  the layout root, removes it via `setTimeout(…, 700)` in `onMount`. All entrance
  animations are scoped under `.boot` so backend-tab switches (which re-key the
  `{#each}` over sections) do NOT replay them.
- [x] Stagger via `style:animation-delay={Math.min(i, 8) * 50 + 200 + "ms"}` on
  `SectionCard` wrappers (pass `i` down or set it in `App.svelte`), and
  `animation-fill-mode: both` so pre-delay frames hold the hidden state.
- [x] Easing `cubic-bezier(0.2, 0.9, 0.25, 1)`; movement is translateY only
  (no scale, no blur). Shadow landing = separate keyframe animating `box-shadow`.
- [x] `@media (prefers-reduced-motion: reduce)`: all boot animations `none`.
- [x] Acceptance: reload feels like the page snapping together, total under 600ms;
  switching backend tabs replays nothing; no layout shift after boot ends.

## 7. Keyboard mode + keymap card

**Goal:** the whole review loop works from the keyboard, and `?` shows a keymap card
whose keycaps press when you use them.

- [x] State: add to `ReviewState`: `keymapOpen = $state(false)` and
  `cursorHunk = $state<string | null>(null)`. Build a flat ordered hunk-id list from
  `payload.files` in the constructor (files in order, hunks in order).
- [x] Global handler: extend the existing `onKey` in `App.svelte` `onMount` (keep the
  Esc stack; add Esc-closes-keymap at the top of the stack). Ignore all shortcuts when
  `e.target` is an `input`/`textarea`/`[contenteditable]`, or when
  `review.composer` is open. Keys:
  - `j` / `k` — move `cursorHunk` to next/prev hunk; scroll it centered
    (`scrollIntoView({ block: "center" })`, open its parent `<details>` first, same
    pattern as `jumpToFinding` in `state.svelte.ts`) and apply the `jump-flash` class.
  - `v` — `review.toggleViewed(cursorHunk)`.
  - `n` / `p` — cycle through open findings via `review.jumpToFinding(key)`
    (order = `sortedFindings` filtered by `isFindingOpen`).
  - `c` — open the composer on the cursor hunk:
    `review.openComposer(ref, "", { jump: { kind: "line", hunkId, idx: 0 } })` with
    `ref` from `refForLine(hunkId, 0)`.
  - `shift+D` — `review.done()` (shift required; accidental submits are unacceptable).
  - `?` — toggle `review.keymapOpen`.
- [x] Cursor visibility: the current hunk's container gets `outline: 2px solid var(--accent);
  outline-offset: -2px;`. Find the hunk wrapper element in `DiffView.svelte` /
  `PierreDiff.svelte` (look for where `data-hunk` attributes are set) and bind a
  class off `review.cursorHunk`.
- [x] Keymap overlay: new `ui/src/components/KeymapOverlay.svelte` mounted in
  `App.svelte` — fixed, centered, hard card (`--shadow-pop`), two-column list of
  bindings. Each key is a keycap span: mono font, `border: 2px solid var(--border)`,
  `box-shadow: var(--shadow-btn)`, `padding: 1px 7px`. While the overlay is open,
  a keydown matching a keycap plays the press (translate 2px + shadow collapse,
  100ms) — listen on window, match by `e.key`.
- [x] Acceptance: full loop — `j j v n c` type text, Esc, `shift+D` — without touching
  the mouse; `?` card shows everything; typing in the composer never triggers shortcuts.

## 8. Marginalia comments

**Goal:** saved comments appear as margin notes beside their source lines, connected
by a hard 2px orange elbow — the review reads as a marked-up manuscript.
*This is the hardest item; do it last. Wide screens (≥1400px) only — the rail remains
the canonical list everywhere.*

- [x] New `ui/src/components/MarginNotes.svelte`, rendered inside `<main>`
  (give `main` `position: relative`). It owns an absolutely-positioned layer on the
  right edge of the main column, ~180px wide (add matching `padding-right` to `main`
  at the ≥1400px breakpoint so notes never cover code).
- [x] For each `review.comments` entry with `jump.kind === "line"`, resolve the target
  element (`[data-hunk][data-idx]`, `CSS.escape` — copy the lookup from
  `jumpToComment`), compute `targetRect.top` relative to `main`'s box, and place a
  note card at that y. Skip comments whose target is inside a closed `<details>`
  (`el.closest("details:not([open])")`).
- [x] Note card: `--fs-xs`, 2px border, `--bg-raised`, `--shadow-btn`, text clamped to
  3 lines; clicking calls `review.jumpToComment(comment)`. Elbow connector: `::before`
  pseudo-element — a 24px horizontal 2px `var(--accent)` rule leaving the note's left
  edge at first-line height (square corner, no curves).
- [x] Collision handling: sort notes by y; walk down pushing each note below the
  previous (`minGap 8px`).
- [x] Reposition on: `ResizeObserver` on `main`, window resize, and `<details>`
  toggle (a single delegated `toggle` listener on `main`, capture phase). No
  per-frame scroll work — positions are document-relative.
- [x] Acceptance: add three comments on nearby lines — notes stack without overlap,
  elbows point at the right lines, clicking a note flashes the source line, collapsing
  the file's details hides its notes.

## 9. Graph-paper diagrams

- [x] *(applied — `Diagram.svelte` now lays a 16px `--d-grid` line grid under both
  light and dark diagram cards, derived from `--d-line` so the dark override
  recolors it automatically.)*
- [x] Optional follow-up: hard shadows on SVG nodes — in `Diagram.svelte` add
  `.diagram :global(.node) > :global(rect) { filter: drop-shadow(3px 3px 0 var(--d-border)); }`
  and check it doesn't smear on `polygon`/`circle` nodes or wreck sequence diagrams;
  scope to flowchart nodes only if it does.

## 10. Jump impact

- [x] *(applied — `app.css` `jump-flash` is now a hard double blink with a 4px accent
  left rule, cuts instead of fades, with a plain-fade `prefers-reduced-motion`
  fallback. Duration 0.8s; the `900ms` classList timeout in
  `state.svelte.ts:jumpToComment` still covers it — keep those in sync if retimed.)*

## 11. INK / PAPER theme flip

**Goal:** an explicit theme toggle in the header. Hard cut, no crossfade.

- [x] Tokens: in `app.css`, duplicate the entire dark `@media` token block as
  `:root[data-theme="dark"] { … }`, and add `:root[data-theme="light"] { … }`
  restating the light values from `:root` (needed to beat the media query when the OS
  is dark). Keep the three blocks byte-identical in variable coverage — a missed
  variable shows up as a half-flipped theme. Also flip the `color-scheme` property
  (`light` / `dark`) so form controls and scrollbars follow.
- [x] **Investigate Pierre first:** grep the SSR CSS for `prefers-color-scheme`
  (`payload.pierre.css` — search `src/pierre-render.ts` for how themes are emitted).
  If Pierre's diff colors are media-query-bound, the toggle would flip the chrome but
  not the code. Find Pierre's theme class/variable mechanism and drive it from
  `data-theme` too; if that is impossible, stop and reconsider the item — a
  half-themed page is worse than no toggle.
- [x] Toggle: in `ProgressHeader.svelte` next to the Unified/Split group, a two-option
  group in the same style labeled `PAPER` / `INK`. Clicking sets
  `document.documentElement.dataset.theme` and persists to
  `localStorage["semantic-review:theme"]` (guard with try/catch like `setLeftWidth`).
- [x] No-flash boot: in `ui/src/main.ts`, before mounting, read the stored value and
  set `dataset.theme`. Default (nothing stored) keeps following the OS.
- [x] Mermaid SVGs are pre-rendered with theme-agnostic `--d-*` variables — verify a
  flipped theme recolors diagrams correctly (it should, via `Diagram.svelte` tokens;
  but its `@media (prefers-color-scheme: dark)` overrides need the same
  `[data-theme]` treatment — restructure those into shared custom properties).
- [x] Acceptance: toggle flips instantly (one frame, no transition), diffs and
  diagrams flip with the chrome, choice survives reload, removing the stored key
  reverts to OS-following.
