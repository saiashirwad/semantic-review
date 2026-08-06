<script lang="ts">
  import { getReviewState } from "../state.svelte";

  const review = getReviewState();
  const fileCount = $derived(review.payload.files.length);
</script>

<header>
  <h1>{review.payload.title}</h1>
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
    height: var(--header-h);
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

  @media (max-width: 800px) {
    header {
      flex-wrap: wrap;
      height: auto;
      padding: 8px 12px;
      gap: 8px;
    }
    h1 {
      flex-basis: calc(100% - 160px);
    }
    .progress {
      order: 5;
    }
  }
</style>
