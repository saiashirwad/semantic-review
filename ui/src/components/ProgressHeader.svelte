<script lang="ts">
  import { onMount } from "svelte";
  import { getReviewState } from "../state.svelte.ts";

  const review = getReviewState();
  const fileCount = $derived(review.payload.files.length);

  let headerEl = $state<HTMLElement | null>(null);

  onMount(() => {
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
</script>

<header bind:this={headerEl} class:narrow={review.narrow}>
  <h1>{review.payload.title}</h1>

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
    <span class="progress" title="Files fully viewed · lines not yet viewed">
      <b>{review.viewedFileCount}</b>/{fileCount} files
      <span class="dot">·</span>
      <b>{review.linesLeft.toLocaleString()}</b> lines left
    </span>
    <div class="toggle" role="group" aria-label="Diff layout">
      <button class:active={review.diffMode === "unified"} onclick={() => (review.diffMode = "unified")}>
        Unified
      </button>
      <button class:active={review.diffMode === "split"} onclick={() => (review.diffMode = "split")}>Split</button>
    </div>
  </div>

  <button class="done" onclick={() => review.done()}>Done</button>
</header>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 0 16px;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-raised);
  }

  h1 {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font-size: var(--fs-md);
    font-weight: 600;
    line-height: var(--lh-tight);
    letter-spacing: -0.015em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chrome {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* Narrow: title + Done on first row; chrome on second */
  header.narrow {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 10px;
    row-gap: 8px;
    height: auto;
    min-height: 0;
    padding: 8px 12px 10px;
  }

  header.narrow h1 {
    grid-column: 1;
    grid-row: 1;
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

  .dot {
    margin: 0 2px;
    color: var(--fg-faint);
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

  .toggle button.active {
    background: var(--accent);
    color: var(--accent-fg);
  }

  .done {
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
  }

  .done:hover {
    background: var(--action-hover);
  }

  .done:active {
    transform: translate(1px, 1px);
    box-shadow: none;
  }
</style>
