<script lang="ts">
  import { getReviewState } from "../state.svelte";

  const review = getReviewState();
  const fileCount = $derived(review.payload.files.length);
</script>

<header>
  <span class="brand">semantic-review</span>
  <span class="divider"></span>
  <h1>{review.payload.title}</h1>
  <span class="progress" title="Files fully viewed · lines not yet viewed">
    {review.viewedFileCount}<span class="dim">/{fileCount} files</span>
    <span class="dot">·</span>
    {review.linesLeft.toLocaleString()}<span class="dim"> lines left</span>
  </span>
  {#if review.multiTab}
    <select
      title="Analysis by"
      value={String(review.activeResult)}
      onchange={(e) => (review.activeResult = Number(e.currentTarget.value))}
    >
      {#each review.payload.results as result, i}
        <option value={String(i)}>{result.backend}</option>
      {/each}
    </select>
  {/if}
  <div class="toggle" role="group" aria-label="Diff layout">
    <button class:active={review.diffMode === "unified"} onclick={() => (review.diffMode = "unified")}>
      Unified
    </button>
    <button class:active={review.diffMode === "split"} onclick={() => (review.diffMode = "split")}>Split</button>
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
    gap: 12px;
    height: 48px;
    padding: 0 20px;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(10px);
  }

  .brand {
    color: var(--fg-faint);
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: 0.01em;
    white-space: nowrap;
  }

  .divider {
    width: 1px;
    height: 16px;
    background: var(--border-strong);
  }

  h1 {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: -0.01em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .progress {
    color: var(--fg);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .dim {
    color: var(--fg-faint);
  }

  .dot {
    margin: 0 2px;
    color: var(--fg-faint);
  }

  select {
    height: 28px;
    padding: 0 6px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-raised);
    font-size: 12.5px;
  }

  select:hover {
    border-color: var(--border-strong);
  }

  .toggle {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-inset);
  }

  .toggle button {
    height: 22px;
    padding: 0 10px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--fg-muted);
    font-size: 12px;
    font-weight: 500;
  }

  .toggle button:hover {
    color: var(--fg);
  }

  .toggle button.active {
    background: var(--bg-raised);
    color: var(--fg);
    box-shadow: var(--shadow-card);
  }

  .done {
    height: 28px;
    padding: 0 14px;
    border: 0;
    border-radius: var(--radius-sm);
    background: var(--accent);
    color: var(--accent-fg);
    font-size: 12.5px;
    font-weight: 600;
  }

  .done:hover {
    background: var(--accent-hover);
  }

  @media (max-width: 800px) {
    header {
      flex-wrap: wrap;
      height: auto;
      padding: 8px 14px;
    }
    h1 {
      flex-basis: calc(100% - 140px);
    }
    .progress {
      order: 5;
    }
  }
</style>
