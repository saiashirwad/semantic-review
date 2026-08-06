<script lang="ts">
  import { getReviewState } from "../state.svelte";
  import { startPopoverDrag, type Point } from "../popover-drag";
  import CodeQuote from "./CodeQuote.svelte";
  import DragGrip from "./DragGrip.svelte";

  const review = getReviewState();

  let text = $state("");
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let boxEl = $state<HTMLElement | null>(null);
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
    const height = boxEl?.offsetHeight ?? EST_HEIGHT;
    const viewportBottom = window.scrollY + window.innerHeight;
    let top = anchor.top + 8;
    if (top + height > viewportBottom - 8) top = anchor.top - height - 12;
    top = Math.max(window.scrollY + 8, top);
    return { left, top };
  });

  const pos = $derived(dragPos ?? basePos);
  const style = $derived(`left: ${pos.left}px; top: ${pos.top}px;`);

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
    const h = boxEl?.offsetHeight ?? EST_HEIGHT;
    const w = boxEl?.offsetWidth ?? WIDTH;
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
  <div class="composer" {style} bind:this={boxEl} role="dialog" aria-label="Add comment">
    <header class="head">
      <DragGrip onpointerdown={onDragStart} />
      <span class="kicker">Comment</span>
      <button type="button" class="close" title="Close (Esc)" onclick={() => (review.composer = null)}>
        ✕
      </button>
    </header>

    <div class="body">
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
  </div>
{/if}

<style>
  .composer {
    position: absolute;
    z-index: 40;
    width: 440px;
    max-width: calc(100vw - 24px);
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    color: var(--fg);
    box-shadow: var(--shadow-pop);
    font-family: var(--font-ui);
  }

  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 0 8px 0 6px;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-panel);
    color: var(--fg);
    user-select: none;
  }

  .kicker {
    flex: 1;
    color: var(--accent);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .close {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin: 0;
    padding: 0;
    border: 2px solid transparent;
    background: transparent;
    color: var(--fg-muted);
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
  }

  .close:hover {
    border-color: var(--border);
    background: var(--bg-hover);
    color: var(--fg);
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
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

  .btn {
    height: 34px;
    padding: 0 14px;
    border: var(--border-w) solid var(--border);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: var(--shadow-btn);
  }

  .btn:active:not(:disabled) {
    transform: translate(1px, 1px);
    box-shadow: none;
  }

  .btn.ghost {
    background: var(--bg-raised);
    color: var(--fg);
  }

  .btn.ghost:hover {
    background: var(--bg-hover);
  }

  .btn.save {
    background: var(--accent);
    color: var(--accent-fg);
    min-width: 72px;
  }

  .btn.save:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn.save:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
</style>
