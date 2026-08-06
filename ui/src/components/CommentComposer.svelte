<script lang="ts">
  import { getReviewState } from "../state.svelte.ts";
  import { startPopoverDrag, type Point } from "../popover-drag.ts";
  import CodeQuote from "./CodeQuote.svelte";
  import FloatingChrome from "./FloatingChrome.svelte";

  const review = getReviewState();

  let text = $state("");
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let el = $state<HTMLElement | null>(null);
  /** Once the user drags, we stop re-deriving position from the anchor. */
  let dragPos = $state<Point | null>(null);

  const WIDTH = 440;
  const EST_HEIGHT = 280;

  const lineCount = $derived.by(() => {
    const q = review.composer?.quote ?? "";
    if (!q.trim()) return 0;
    return q.split("\n").length;
  });

  const basePos = $derived.by((): Point => {
    const anchor = review.composer?.anchor;
    if (!anchor) {
      return {
        left: window.scrollX + document.documentElement.clientWidth - WIDTH - 24,
        top: window.scrollY + window.innerHeight - EST_HEIGHT - 20,
      };
    }
    const left = Math.max(8, Math.min(anchor.left, document.documentElement.clientWidth - WIDTH - 8));
    const height = el?.offsetHeight ?? EST_HEIGHT;
    const viewportBottom = window.scrollY + window.innerHeight;
    let top = anchor.top + 8;
    if (top + height > viewportBottom - 8) top = anchor.top - height - 12;
    top = Math.max(window.scrollY + 8, top);
    return { left, top };
  });

  const pos = $derived(dragPos ?? basePos);
  const style = $derived(
    `position:absolute;left:${pos.left}px;top:${pos.top}px;width:440px;max-width:calc(100vw - 24px);z-index:40`,
  );

  $effect(() => {
    if (review.composer) {
      text = "";
      dragPos = null;
      requestAnimationFrame(() => {
        textareaEl?.focus();
      });
    }
  });

  function onDragStart(e: PointerEvent) {
    const h = el?.offsetHeight ?? EST_HEIGHT;
    const w = el?.offsetWidth ?? WIDTH;
    startPopoverDrag(e, pos, (p) => (dragPos = p), {
      mode: "absolute",
      width: w,
      height: h,
    });
  }

  function onkeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      review.saveComment(text);
    }
    if (e.key === "Escape") review.composer = null;
  }

  function save() {
    review.saveComment(text);
  }
</script>

{#if review.composer}
  <FloatingChrome
    class="composer"
    ariaLabel="Add comment"
    {style}
    bind:el
    onclose={() => (review.composer = null)}
    ondragstart={onDragStart}
  >
    {#snippet head()}
      <span class="kicker">Comment</span>
    {/snippet}

    <div class="stack">
      <div class="meta">
        <span class="ref" title={review.composer.ref}>{review.composer.ref}</span>
        {#if lineCount > 1}
          <span class="chip">{lineCount} lines</span>
        {:else if lineCount === 1}
          <span class="chip">1 line</span>
        {/if}
      </div>

      <CodeQuote html={review.composer.html} quote={review.composer.quote} maxHeight="120px" />

      <label class="field">
        <span class="field-label">Your note</span>
        <textarea
          bind:this={textareaEl}
          bind:value={text}
          placeholder="What should change, and why?"
          {onkeydown}
          rows="3"
        ></textarea>
      </label>

      <footer class="foot">
        <span class="hint"><kbd>⌘</kbd><kbd>↵</kbd> save · <kbd>esc</kbd> cancel</span>
        <div class="actions">
          <button type="button" class="btn ghost" onclick={() => (review.composer = null)}>Cancel</button>
          <button type="button" class="btn save" onclick={save} disabled={!text.trim()}>Save</button>
        </div>
      </footer>
    </div>
  </FloatingChrome>
{/if}

<style>
  .kicker {
    flex: 1;
    color: var(--accent);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .ref {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--fg-muted);
    font-family: var(--font-code);
    font-size: 12px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chip {
    flex-shrink: 0;
    padding: 2px 7px;
    border: var(--border-w) solid var(--border);
    background: var(--accent);
    color: var(--accent-fg);
    font-family: var(--font-code);
    font-size: 10px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    box-shadow: 2px 2px 0 var(--border);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    color: var(--fg-faint);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  textarea {
    display: block;
    width: 100%;
    min-height: 88px;
    margin: 0;
    padding: 10px 12px;
    resize: vertical;
    border: var(--border-w) solid var(--border);
    background: var(--bg-panel);
    color: var(--fg);
    font-family: var(--font-ui);
    font-size: var(--fs-sm);
    font-weight: 500;
    line-height: 1.45;
    box-shadow: inset 0 0 0 0 var(--accent);
    transition: box-shadow 0.08s ease;
  }

  textarea::placeholder {
    color: var(--fg-faint);
    font-weight: 400;
  }

  textarea:focus {
    outline: none;
    box-shadow: inset 3px 0 0 var(--accent);
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 2px;
  }

  .hint {
    color: var(--fg-faint);
    font-size: 11px;
    font-weight: 500;
  }

  .hint kbd {
    display: inline-block;
    min-width: 1.1em;
    padding: 0 4px;
    border: 1px solid var(--border);
    background: var(--bg-inset);
    color: var(--fg-muted);
    font-family: var(--font-code);
    font-size: 10px;
    font-weight: 700;
    line-height: 1.5;
    text-align: center;
    box-shadow: 1px 1px 0 var(--border);
  }

  .actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  :global(.float.composer .btn.save) {
    min-width: 72px;
    height: 34px;
    padding: 0 14px;
  }

  :global(.float.composer .btn.ghost) {
    height: 34px;
    padding: 0 14px;
  }
</style>
