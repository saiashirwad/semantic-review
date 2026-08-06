<script lang="ts">
  import type { PayloadFile } from "../../../src/payload.ts";
  import { getReviewState } from "../state.svelte.ts";
  import Check from "./Check.svelte";

  const review = getReviewState();
  const fileCount = $derived(review.payload.files.length);
  const viewedCount = $derived(review.viewedFileCount);

  function baseName(path: string) {
    const i = path.lastIndexOf("/");
    return i >= 0 ? path.slice(i + 1) : path;
  }

  function onJump(file: PayloadFile) {
    void review.jumpToFile(file.path);
  }
</script>

<aside
  class="files-rail"
  class:drawer={review.narrow}
  class:open={review.diffOpen}
  id="diff-panel"
  aria-label="Files"
  aria-hidden={!review.diffOpen ? "true" : undefined}
>
  <header class="head">
    <span class="label">Files</span>
    <span class="progress" title="Files marked viewed">
      <b>{viewedCount}</b><span class="slash">/</span>{fileCount}
    </span>
    <button
      type="button"
      class="tuck"
      title={review.narrow ? "Close (Esc)" : "Hide files"}
      aria-label={review.narrow ? "Close files" : "Hide files"}
      onclick={() => review.tuckDiff()}
    >
      {review.narrow ? "✕" : "‹"}
    </button>
  </header>

  <p class="hint">Mark files viewed after you scan the full diff.</p>

  <ul class="checklist" aria-label="Files to review">
    {#each review.payload.files as file (file.path)}
      {@const viewed = review.fileViewed(file)}
      <li class="check-row" class:viewed>
        <Check
          checked={viewed}
          ariaLabel={viewed ? `Unmark ${file.path} as viewed` : `Mark ${file.path} as viewed`}
          onchange={() => review.setFileViewed(file, !viewed)}
        />
        <button type="button" class="file-jump" title={file.path} onclick={() => onJump(file)}>
          <span class="file-base">{baseName(file.path)}</span>
          <span class="counts">
            {#if file.adds > 0}<b class="add">+{file.adds}</b>{/if}
            {#if file.dels > 0}<b class="del">−{file.dels}</b>{/if}
          </span>
        </button>
      </li>
    {/each}
  </ul>
</aside>

<style>
  aside {
    position: sticky;
    top: var(--header-h);
    height: calc(100vh - var(--header-h));
    overflow-y: auto;
    padding: 10px 8px 20px;
  }

  aside:not(.drawer):not(.open) {
    display: none;
  }

  aside.drawer {
    position: fixed;
    top: var(--header-h);
    left: 0;
    bottom: 0;
    z-index: 30;
    width: min(280px, calc(100vw - 48px));
    height: auto;
    padding: 12px 10px 20px;
    background: var(--bg-raised);
    border-right: var(--border-w) solid var(--border);
    box-shadow: 8px 0 0 var(--border);
    transform: translateX(-100%);
    visibility: hidden;
    pointer-events: none;
    transition:
      transform 0.12s linear,
      visibility 0.12s linear;
  }

  aside.drawer.open {
    transform: translateX(0);
    visibility: visible;
    pointer-events: auto;
  }

  @media (prefers-reduced-motion: reduce) {
    aside.drawer {
      transition: none;
    }
  }

  .head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    padding: 0 2px;
  }

  .label {
    color: var(--fg-faint);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .progress {
    color: var(--fg-faint);
    font-family: var(--font-code);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .progress b {
    color: var(--fg);
    font-weight: 700;
  }

  .slash {
    margin: 0 1px;
    color: var(--fg-faint);
  }

  .tuck {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    margin: 0 0 0 auto;
    padding: 0;
    border: 2px solid transparent;
    background: transparent;
    color: var(--fg-muted);
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
  }

  .tuck:hover {
    border-color: var(--border);
    background: var(--bg-hover);
    color: var(--fg);
  }

  .hint {
    margin: 0 0 8px;
    padding: 0 2px;
    color: var(--fg-faint);
    font-size: 10px;
    font-weight: 500;
    line-height: 1.35;
  }

  .checklist {
    margin: 0;
    padding: 0;
    list-style: none;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
  }

  .check-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 4px 8px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 16%, transparent);
  }

  .check-row:last-child {
    border-bottom: 0;
  }

  .check-row:hover {
    background: var(--bg-hover);
  }

  .check-row :global(.check) {
    flex-shrink: 0;
  }

  .file-jump {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    min-height: 24px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--fg);
    text-align: left;
    cursor: pointer;
  }

  .file-base {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--fg);
    font-family: var(--font-code);
    font-size: 12px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .check-row.viewed .file-base {
    color: var(--fg-faint);
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }

  .counts {
    flex-shrink: 0;
    display: inline-flex;
    gap: 3px;
    font-family: var(--font-code);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  .add {
    color: var(--selected);
  }

  .del {
    color: var(--sev-critical);
  }
</style>
