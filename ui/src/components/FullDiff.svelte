<script lang="ts">
  import { getReviewState } from "../state.svelte";
  import DiffView from "./DiffView.svelte";

  const review = getReviewState();
</script>

<section id="full-diff" data-ctx="Full diff">
  <h2><span class="num">{review.analysis.sections.length + 1}</span>Full diff</h2>
  {#each review.payload.files as file (file.path)}
    <details data-ctx="Full diff: {file.path}">
      <summary>
        <span class="chevron">▸</span>
        <span class="path">{file.path}</span>
        <span class="counts">
          <b class="add">+{file.adds}</b>
          <b class="del">−{file.dels}</b>{file.status !== "modified" ? ` · ${file.status}` : ""}
        </span>
        <label class="viewed">
          <input
            type="checkbox"
            checked={review.fileViewed(file)}
            onclick={(e) => e.stopPropagation()}
            onchange={(e) => review.setFileViewed(file, e.currentTarget.checked)}
          />
          Viewed
        </label>
      </summary>
      {#if file.status === "binary"}
        <p class="binary">binary file</p>
      {:else}
        {#each file.hunks as hunk (hunk.id)}
          <DiffView {file} {hunk} viewable />
        {/each}
      {/if}
    </details>
  {/each}
</section>

<style>
  section {
    margin-top: 40px;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .num {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 11.5px;
    font-weight: 600;
    line-height: 20px;
    text-align: center;
  }

  details {
    margin: 8px 0;
  }

  summary {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 36px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary:hover {
    background: var(--bg-hover);
  }

  .chevron {
    color: var(--fg-faint);
    font-size: 10px;
    transition: transform 0.12s;
  }

  details[open] .chevron {
    transform: rotate(90deg);
  }

  .path {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .counts {
    color: var(--fg-muted);
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .add {
    color: var(--add-fg);
    font-weight: 500;
  }

  .del {
    color: var(--del-fg);
    font-weight: 500;
  }

  .viewed {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--fg-muted);
    font-size: 11.5px;
    white-space: nowrap;
    cursor: pointer;
  }

  .viewed input {
    width: 13px;
    height: 13px;
    margin: 0;
    accent-color: var(--accent);
  }

  .binary {
    color: var(--fg-faint);
    font-size: 13px;
    font-style: italic;
  }
</style>
