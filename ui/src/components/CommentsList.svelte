<script lang="ts">
  import { getReviewState } from "../state.svelte";

  const review = getReviewState();
</script>

{#if review.comments.length === 0}
  <p class="empty">Select text or hit <span class="plus">+</span> on a line to comment.</p>
{:else}
  {#each review.comments as comment, i (i)}
    <article class="card">
      <header class="card-head">
        <span class="ref" title={comment.ref}>
          {#if review.multiTab && comment.backend}
            <span class="backend">{comment.backend}</span>
          {/if}
          {comment.ref}
        </span>
        <button type="button" class="delete" title="Delete comment" onclick={() => review.deleteComment(i)}>
          ✕
        </button>
      </header>

      {#if review.commentHtml[i] || comment.quote}
        <div class="quote-frame">
          <div class="quote-bar" aria-hidden="true"></div>
          {#if review.commentHtml[i]}
            <blockquote class="quote">
              {#each review.commentHtml[i]!.split("\n") as lineHtml}
                <span class="qline">{@html lineHtml || "&nbsp;"}</span>
              {/each}
            </blockquote>
          {:else}
            <blockquote class="quote plain">{comment.quote}</blockquote>
          {/if}
        </div>
      {/if}

      <div class="text">{comment.text}</div>
    </article>
  {/each}
{/if}

<style>
  .empty {
    width: 100%;
    margin: 0;
    padding: 12px 14px;
    border: 2px dashed var(--border);
    background: var(--bg-raised);
    color: var(--fg-faint);
    font-size: var(--fs-sm);
    font-weight: 500;
    box-sizing: border-box;
  }

  .empty .plus {
    display: inline-grid;
    place-items: center;
    width: 16px;
    height: 16px;
    margin: 0 2px;
    border: 1px solid var(--border);
    background: var(--accent);
    color: var(--accent-fg);
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    vertical-align: -2px;
  }

  .card {
    width: 100%;
    margin-bottom: 10px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
    box-sizing: border-box;
    overflow: hidden;
  }

  .card-head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    padding: 0 8px 0 12px;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-panel);
  }

  .ref {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--fg-muted);
    font-family: var(--font-code);
    font-size: 11px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .backend {
    display: inline-block;
    margin-right: 6px;
    padding: 0 5px;
    border: 1px solid var(--border);
    background: var(--fg);
    color: var(--bg-raised);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    vertical-align: 1px;
  }

  .delete {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 2px solid transparent;
    background: transparent;
    color: var(--fg-faint);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .delete:hover {
    border-color: var(--border);
    background: var(--bg-hover);
    color: var(--fg);
  }

  .quote-frame {
    display: flex;
    margin: 10px 12px 0;
    overflow: hidden;
    border: var(--border-w) solid var(--border);
    background: var(--bg-code);
    box-shadow: 2px 2px 0 var(--border);
  }

  .quote-bar {
    flex-shrink: 0;
    width: 3px;
    background: var(--accent);
  }

  .quote {
    flex: 1;
    min-width: 0;
    margin: 0;
    padding: 8px 10px;
    overflow: auto;
    max-height: 96px;
    border: 0;
    background: transparent;
    color: var(--fg-code);
    font-family: var(--font-code);
    font-size: 11px;
    line-height: 1.5;
    white-space: pre;
    word-break: normal;
    overflow-wrap: normal;
  }

  .quote :global(span[style]) {
    background: transparent !important;
  }

  .qline {
    display: block;
    min-height: 1.5em;
    white-space: pre;
  }

  .quote.plain {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .text {
    padding: 10px 12px 12px;
    font-size: var(--fs-sm);
    font-weight: 500;
    line-height: 1.45;
    white-space: pre-wrap;
  }
</style>
