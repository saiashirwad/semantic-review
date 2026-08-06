<script lang="ts">
  import { onMount } from "svelte";
  import { getReviewState } from "../state.svelte.ts";
  import {
    applyThemeDataset,
    readThemeFromStorage,
    writeThemeToStorage,
    type ThemeChoice,
  } from "../helpers.ts";
  import Odometer from "./Odometer.svelte";

  const review = getReviewState();
  const fileCount = $derived(review.payload.files.length);

  let headerEl = $state<HTMLElement | null>(null);
  /** Explicit theme override; null = follow OS. */
  let theme = $state<ThemeChoice | null>(null);

  onMount(() => {
    theme = readThemeFromStorage((k) => {
      try {
        return window.localStorage.getItem(k);
      } catch {
        return null;
      }
    });

    const el = headerEl;
    if (!el) return;

    const measure = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  function setTheme(next: ThemeChoice | null) {
    theme = next;
    applyThemeDataset(document.documentElement, next);
    writeThemeToStorage(
      (k, v) => window.localStorage.setItem(k, v),
      (k) => window.localStorage.removeItem(k),
      next,
    );
  }

  /** Effective theme for the PAPER/INK active state. */
  const effectiveTheme = $derived.by((): ThemeChoice => {
    if (theme === "light" || theme === "dark") return theme;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });
</script>

<header
  class="progress-header"
  bind:this={headerEl}
  class:narrow={review.narrow}
  class:title-hidden={review.mastheadVisible}
>
  <h1>
    <span class="brand" aria-hidden="true"></span>
    <span class="title-text">{review.payload.title}</span>
  </h1>

  <div class="chrome">
    <div class="rail-chips" role="group" aria-label="Side panels">
      <button
        type="button"
        class="rail-chip"
        class:open={review.walkOpen}
        aria-expanded={review.walkOpen}
        aria-controls="walk-panel"
        title={review.walkOpen ? "Hide walkthrough" : "Show walkthrough"}
        onclick={() => review.toggleWalk()}
      >
        Walk
      </button>
      <button
        type="button"
        class="rail-chip"
        class:open={review.diffOpen}
        aria-expanded={review.diffOpen}
        aria-controls="diff-panel"
        title={review.diffOpen ? "Hide files" : "Show files to mark viewed"}
        onclick={() => review.toggleDiff()}
      >
        Files
        <span class="count-badge files" class:done={review.viewedFileCount === fileCount && fileCount > 0}>
          {review.viewedFileCount}/{fileCount}
        </span>
      </button>
      <button
        type="button"
        class="rail-chip"
        class:open={review.reviewOpen}
        aria-expanded={review.reviewOpen}
        aria-controls="review-panel"
        title={review.reviewOpen ? "Hide review panel" : "Show review panel"}
        onclick={() => review.toggleReview()}
      >
        Review
        {#if review.openFindingCount > 0}
          <span class="count-badge">{review.openFindingCount}</span>
        {/if}
      </button>
    </div>
    {#if review.multiTab}
      <div class="tabs" role="tablist" aria-label="Analysis backend">
        {#each review.payload.results as result, i}
          <button
            type="button"
            role="tab"
            class:active={review.activeResult === i}
            aria-selected={review.activeResult === i}
            onclick={() => review.setActiveResult(i)}
          >
            {result.backend}
          </button>
        {/each}
      </div>
    {/if}
    <span class="progress" title="Lines not yet viewed">
      <b><Odometer value={review.linesLeft} /></b> lines left
    </span>
    <div class="toggle" role="group" aria-label="Diff layout">
      <button class:active={review.diffMode === "unified"} onclick={() => (review.diffMode = "unified")}>
        Unified
      </button>
      <button class:active={review.diffMode === "split"} onclick={() => (review.diffMode = "split")}>Split</button>
    </div>
    <div class="toggle theme" role="group" aria-label="Color theme">
      <button
        type="button"
        class:active={effectiveTheme === "light"}
        title="Paper (light)"
        onclick={() => setTheme("light")}
      >
        PAPER
      </button>
      <button
        type="button"
        class:active={effectiveTheme === "dark"}
        title="Ink (dark)"
        onclick={() => setTheme("dark")}
      >
        INK
      </button>
    </div>
  </div>

  <button class="done" class:armed={review.linesLeft === 0} onclick={() => review.done()}>Done</button>

  {#if fileCount > 0}
    <div
      class="file-progress"
      role="group"
      aria-label="File progress"
      style:grid-template-columns="repeat({fileCount}, 1fr)"
    >
      {#each review.payload.files as file (file.path)}
        <button
          type="button"
          class="seg"
          class:filled={review.fileViewed(file)}
          title={file.path}
          aria-label={file.path}
          onclick={() => review.jumpToFile(file.path)}
        ></button>
      {/each}
    </div>
  {/if}
</header>

<style>
  /* Grid, not wrapping flex: row 1 = controls (48px), row 2 = progress strip.
     Flex line-stretching left a white band around the 8px strip. */
  header {
    position: sticky;
    top: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    column-gap: 10px;
    width: 100%;
    padding: 0 12px;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-raised);
  }

  h1 {
    grid-row: 1;
    grid-column: 1;
    display: flex;
    align-items: center;
    min-width: 0;
    min-height: 48px;
    margin: 0;
    overflow: hidden;
    font-size: var(--fs-md);
    font-weight: 600;
    line-height: var(--lh-tight);
    letter-spacing: -0.015em;
    white-space: nowrap;
  }

  .brand {
    flex-shrink: 0;
    width: 9px;
    height: 9px;
    margin-right: 9px;
    border: 2px solid var(--border);
    background: var(--accent);
  }

  .title-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: transform 120ms cubic-bezier(0.2, 0, 0, 1), visibility 120ms;
  }

  /* Sticky handoff: masthead owns the title while visible; brand stays */
  header.title-hidden .title-text {
    visibility: hidden;
    transform: translateY(-4px);
  }

  .chrome {
    grid-row: 1;
    grid-column: 2;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* Narrow: title + Done on first row; chrome on second */
  header.narrow {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto auto;
    row-gap: 8px;
    height: auto;
    min-height: 0;
    padding: 8px 12px 0;
  }

  header.narrow h1 {
    grid-column: 1;
    grid-row: 1;
    min-height: 0;
  }

  header.narrow .done {
    grid-column: 2;
    grid-row: 1;
  }

  header.narrow .chrome {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-content: flex-start;
  }

  header.narrow .file-progress {
    grid-column: 1 / -1;
    grid-row: 3;
  }

  .rail-chips {
    display: inline-flex;
    flex-shrink: 0;
    border: var(--border-w) solid var(--border);
    background: var(--bg-inset);
    overflow: hidden;
  }

  .rail-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    border: 0;
    border-right: var(--border-w) solid var(--border);
    border-radius: 0;
    background: transparent;
    color: var(--fg-muted);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .rail-chip:last-child {
    border-right: 0;
  }

  .rail-chip:hover {
    color: var(--fg);
    background: var(--bg-hover);
  }

  .rail-chip:active {
    transform: translate(1px, 1px);
  }

  .rail-chip.open {
    background: var(--fg);
    color: var(--bg-raised);
  }

  .count-badge {
    min-width: 16px;
    padding: 0 4px;
    border: var(--border-w) solid var(--border);
    background: var(--sev-critical);
    color: #fff;
    font-family: var(--font-code);
    font-size: 10px;
    font-weight: 700;
    line-height: 14px;
    text-align: center;
  }

  .count-badge.files {
    background: var(--bg-panel);
    color: var(--fg);
  }

  .count-badge.files.done {
    background: var(--selected);
    color: var(--selected-fg);
  }

  .rail-chip.open .count-badge {
    border-color: var(--bg-raised);
  }

  .rail-chip.open .count-badge.files {
    background: var(--bg-raised);
    color: var(--fg);
    border-color: var(--border);
  }

  .rail-chip.open .count-badge.files.done {
    background: var(--selected);
    color: var(--selected-fg);
  }

  .tabs {
    display: inline-flex;
    flex-shrink: 0;
    max-width: min(280px, 40vw);
    border: var(--border-w) solid var(--border);
    background: var(--bg-inset);
    overflow-x: auto;
  }

  .tabs button {
    height: 28px;
    padding: 0 10px;
    border: 0;
    border-right: var(--border-w) solid var(--border);
    border-radius: 0;
    background: transparent;
    color: var(--fg-muted);
    font-size: var(--fs-xs);
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: lowercase;
    white-space: nowrap;
  }

  .tabs button:last-child {
    border-right: 0;
  }

  .tabs button:hover {
    color: var(--fg);
    background: var(--bg-hover);
  }

  .tabs button:active {
    transform: translate(1px, 1px);
  }

  .tabs button.active {
    background: var(--fg);
    color: var(--bg-raised);
  }

  .progress {
    padding: 4px 8px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-panel);
    font-size: var(--fs-xs);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .progress b {
    font-weight: 700;
  }

  .toggle {
    display: inline-flex;
    border: var(--border-w) solid var(--border);
    background: var(--bg-inset);
    overflow: hidden;
  }

  .toggle button {
    height: 28px;
    padding: 0 10px;
    border: 0;
    border-right: var(--border-w) solid var(--border);
    border-radius: 0;
    background: transparent;
    color: var(--fg-muted);
    font-size: var(--fs-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .toggle button:last-child {
    border-right: 0;
  }

  .toggle button:hover {
    color: var(--fg);
    background: var(--bg-hover);
  }

  .toggle button:active {
    transform: translate(1px, 1px);
  }

  .toggle button.active {
    background: var(--accent);
    color: var(--accent-fg);
  }

  .done {
    grid-row: 1;
    grid-column: 3;
    flex-shrink: 0;
    height: 32px;
    padding: 0 14px;
    border: var(--border-w) solid var(--border);
    border-radius: var(--radius);
    background: var(--action);
    color: var(--action-fg);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    box-shadow: var(--shadow-btn);
    transition:
      transform 80ms cubic-bezier(0.2, 0, 0, 1),
      box-shadow 80ms cubic-bezier(0.2, 0, 0, 1);
  }

  .done:hover {
    background: var(--action-hover);
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--border);
  }

  .done:active {
    transform: translate(2px, 2px);
    box-shadow: 0 0 0 var(--border);
  }

  /* Every line viewed — DONE arms hot with one hard invert blink */
  .done.armed {
    background: var(--accent);
    animation: done-arm 0.35s linear;
  }

  .done.armed:hover {
    background: var(--accent-hover);
  }

  @keyframes done-arm {
    0%,
    45% {
      background: var(--action);
      color: var(--action-fg);
    }
    46%,
    70% {
      background: var(--accent-fg);
      color: var(--accent);
    }
    71%,
    100% {
      background: var(--accent);
      color: var(--action-fg);
    }
  }

  .file-progress {
    grid-row: 2;
    grid-column: 1 / -1;
    display: grid;
    height: 8px;
    margin: 0 -12px;
    border-top: var(--border-w) solid var(--border);
    background: var(--bg-inset);
  }

  .seg {
    display: block;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    border-right: 1px solid var(--border);
    border-radius: 0;
    background: transparent;
    cursor: pointer;
    min-width: 0;
    appearance: none;
    -webkit-appearance: none;
  }

  .seg:last-child {
    border-right: 0;
  }

  .seg.filled {
    background: var(--fg);
  }

  .seg:hover {
    background: color-mix(in srgb, var(--fg) 35%, transparent);
  }

  .seg.filled:hover {
    background: var(--fg);
  }

  @media (prefers-reduced-motion: reduce) {
    .done.armed {
      animation: none;
    }
    .done:hover,
    .done:active,
    .rail-chip:active,
    .tabs button:active,
    .toggle button:active {
      transform: none;
    }
    header.title-hidden .title-text {
      transition: none;
    }
  }
</style>
