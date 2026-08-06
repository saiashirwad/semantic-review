<script lang="ts">
  import { getReviewState } from "../state.svelte";

  const review = getReviewState();
</script>

{#if review.comments.length === 0}
  <p class="empty">Select any text or hover a line and hit + to comment.</p>
{:else}
  {#each review.comments as comment, i (i)}
    <div class="card">
      <button class="delete" title="Delete comment" onclick={() => review.deleteComment(i)}>✕</button>
      <div class="ref">{review.multiTab && comment.backend ? `[${comment.backend}] ` : ""}{comment.ref}</div>
      {#if review.commentHtml[i]}
        <blockquote class="diff">{#each review.commentHtml[i]!.split("\n") as lineHtml}<span class="qline">{@html lineHtml}</span>{/each}</blockquote>
      {:else if comment.quote}
        <blockquote>{comment.quote}</blockquote>
      {/if}
      <div class="text">{comment.text}</div>
    </div>
  {/each}
{/if}

<style>
  .empty {
    width: 100%;
    margin: 0;
    padding: 10px 12px;
    border: 1px dashed var(--border);
    background: var(--bg-raised);
    color: var(--fg-faint);
    font-size: var(--fs-sm);
    box-sizing: border-box;
  }

  .card {
    width: 100%;
    margin-bottom: 8px;
    padding: 10px 12px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
    font-size: var(--fs-sm);
    box-sizing: border-box;
  }

  .delete {
    float: right;
    padding: 0 4px;
    border: 0;
    background: none;
    color: var(--fg-faint);
    font-size: var(--fs-sm);
    font-weight: 700;
  }

  .delete:hover {
    color: var(--fg);
    background: var(--bg-hover);
  }

  .ref {
    overflow: hidden;
    color: var(--fg-faint);
    font-family: var(--font-code);
    font-size: var(--fs-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Code quotes: keep real lines intact. No mid-token wrap — scroll instead. */
  blockquote {
    margin: 6px 0;
    padding: 6px 8px;
    overflow: auto;
    max-height: 88px;
    border-left: 3px solid var(--border);
    background: var(--bg-code);
    color: var(--fg-code);
    font-family: var(--font-code);
    font-size: var(--fs-xs);
    line-height: 1.5;
    white-space: pre;
    word-break: normal;
    overflow-wrap: normal;
  }

  /* Preserve shiki token colors inside quotes */
  blockquote :global(span[style]) {
    background: transparent !important;
  }

  .qline {
    display: block;
    min-height: 1.5em;
    white-space: pre;
  }

  .text {
    margin-top: 4px;
    font-size: var(--fs-sm);
    white-space: pre-wrap;
  }
</style>
