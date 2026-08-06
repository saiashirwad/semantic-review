<script lang="ts">
  import { getReviewState, type UiComment } from "../state.svelte.ts";
  import CodeQuote from "./CodeQuote.svelte";

  const review = getReviewState();

  function onCardClick(comment: UiComment, e: MouseEvent) {
    const t = e.target as HTMLElement;
    if (t.closest("button.delete")) return;
    void review.jumpToComment(comment);
  }

  function onCardKey(comment: UiComment, e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      void review.jumpToComment(comment);
    }
  }
</script>

{#if review.comments.length === 0}
  <p class="empty">Select text or hit <span class="plus">+</span> on a line to comment.</p>
{:else}
  {#each review.comments as comment, i (i)}
    <div
      class="card"
      class:jumpable={!!comment.jump || !!comment.ref}
      role="button"
      tabindex="0"
      title="Jump to source"
      onclick={(e) => onCardClick(comment, e)}
      onkeydown={(e) => onCardKey(comment, e)}
    >
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

      {#if comment.html || comment.quote}
        <div class="quote-wrap">
          <CodeQuote html={comment.html} quote={comment.quote} maxHeight="4.5em" overflow="clip" />
        </div>
      {/if}

      <div class="text">{comment.text}</div>
    </div>
  {/each}
{/if}

<style>
  .empty {
    width: 100%;
    margin: 0;
    padding: 12px 10px;
    border: 0;
    border-bottom: var(--border-w) solid var(--border);
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
    margin: 0;
    border: 0;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: none;
    box-sizing: border-box;
    overflow: hidden;
  }

  .card.jumpable {
    cursor: pointer;
  }

  .card.jumpable:hover {
    background: var(--bg-hover);
  }

  .card.jumpable:hover .card-head {
    background: var(--bg-hover);
  }

  .card:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
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

  .quote-wrap {
    margin: 10px 12px 0;
    overflow: hidden;
  }

  .text {
    padding: 10px 12px 12px;
    font-size: var(--fs-sm);
    font-weight: 500;
    line-height: 1.45;
    white-space: pre-wrap;
  }
</style>
