<script lang="ts">
  import { getReviewState } from "../state.svelte";
  import Check from "./Check.svelte";
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
        <Check
          checked={review.fileViewed(file)}
          label="Viewed"
          stopPropagation
          onchange={(v) => review.setFileViewed(file, v)}
        />
      </summary>
      {#if file.status === "binary"}
        <p class="binary">binary file</p>
      {:else}
        <div class="hunks">
          {#each file.hunks as hunk (hunk.id)}
            <DiffView {file} {hunk} viewable embedded />
          {/each}
        </div>
      {/if}
    </details>
  {/each}
</section>

<style>
  section {
    margin-top: 32px;
    scroll-margin-top: calc(var(--header-h) + 12px);
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 10px;
    font-size: var(--fs-lg);
    font-weight: 700;
  }

  .num {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    color: var(--fg);
    font-size: var(--fs-sm);
    font-weight: 700;
    line-height: 20px;
    text-align: center;
  }

  /* One card per file: summary + hunks share a single border/shadow */
  details {
    margin: 8px 0;
    scroll-margin-top: calc(var(--header-h) + 12px);
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
    overflow: hidden;
  }

  summary {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 36px;
    padding: 6px 12px;
    border: 0;
    background: var(--bg-raised);
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary:hover {
    background: var(--bg-hover);
  }

  details[open] summary {
    border-bottom: var(--border-w) solid var(--border);
  }

  .chevron {
    color: var(--fg-faint);
    font-size: var(--fs-sm);
    transition: transform 0.1s;
  }

  details[open] .chevron {
    transform: rotate(90deg);
  }

  .path {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-family: var(--font-code);
    font-size: var(--fs-sm);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .counts {
    color: var(--fg-muted);
    font-size: var(--fs-xs);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .add {
    color: var(--selected);
    font-weight: 700;
  }

  .del {
    color: var(--sev-critical);
    font-weight: 700;
  }

  .hunks {
    background: var(--bg-code);
  }

  .binary {
    margin: 0;
    padding: 12px;
    color: var(--fg-faint);
    font-size: var(--fs-sm);
  }
</style>
