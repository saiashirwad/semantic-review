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
    margin: 0;
    color: var(--fg-faint);
    font-size: 12.5px;
  }

  .card {
    margin-bottom: 8px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
    font-size: 13px;
  }

  .delete {
    float: right;
    padding: 2px;
    border: 0;
    border-radius: 4px;
    background: none;
    color: var(--fg-faint);
    font-size: 11px;
    line-height: 1;
  }

  .delete:hover {
    background: var(--bg-hover);
    color: var(--fg);
  }

  .ref {
    overflow: hidden;
    color: var(--fg-faint);
    font: var(--font-mono);
    font-size: 10.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  blockquote {
    margin: 6px 0;
    padding: 4px 8px;
    overflow: hidden;
    max-height: 72px;
    border-left: 2px solid var(--border-strong);
    border-radius: 0 4px 4px 0;
    background: var(--bg-inset);
    color: var(--fg-muted);
    font: var(--font-mono);
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .qline {
    display: block;
    min-height: 1.6em;
  }

  .text {
    margin-top: 4px;
    font-size: 12.5px;
    white-space: pre-wrap;
  }
</style>
