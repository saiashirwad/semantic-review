<script lang="ts">
  import { getReviewState } from "../state.svelte";

  const review = getReviewState();

  let text = $state("");
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let boxEl = $state<HTMLElement | null>(null);

  const WIDTH = 420;
  const EST_HEIGHT = 240;

  const style = $derived.by(() => {
    const anchor = review.composer?.anchor;
    if (!anchor) return "position: fixed; right: 24px; bottom: 20px;";
    const left = Math.max(8, Math.min(anchor.left, document.documentElement.clientWidth - WIDTH - 8));
    const height = boxEl?.offsetHeight ?? EST_HEIGHT;
    const viewportBottom = window.scrollY + window.innerHeight;
    let top = anchor.top + 6;
    if (top + height > viewportBottom - 8) top = anchor.top - height - 30;
    top = Math.max(window.scrollY + 8, top);
    return `left: ${left}px; top: ${top}px;`;
  });

  $effect(() => {
    if (review.composer) {
      text = "";
      textareaEl?.focus();
      requestAnimationFrame(() => {
        boxEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  });

  function onkeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") review.saveComment(text);
    if (e.key === "Escape") review.composer = null;
  }
</script>

{#if review.composer}
  <div class="composer" class:anchored={!!review.composer.anchor} {style} bind:this={boxEl}>
    <div class="ref">{review.composer.ref}</div>
    {#if review.composer.html}
      <blockquote class="diff"><!-- eslint-disable-line -->{#each review.composer.html.split("\n") as lineHtml}<span class="qline">{@html lineHtml}</span>{/each}</blockquote>
    {:else if review.composer.quote}
      <blockquote>{review.composer.quote}</blockquote>
    {/if}
    <textarea bind:this={textareaEl} bind:value={text} placeholder="Write a comment… (⌘⏎ to save)" {onkeydown}
    ></textarea>
    <div class="actions">
      <button onclick={() => (review.composer = null)}>Cancel</button>
      <button class="save" onclick={() => review.saveComment(text)}>Save</button>
    </div>
  </div>
{/if}

<style>
  .composer {
    position: absolute;
    z-index: 40;
    width: 420px;
    max-width: calc(100vw - 24px);
    padding: 12px 14px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    /* Reset inherited light text from dark .hunk ancestors */
    color: var(--fg);
    box-shadow: var(--shadow-pop);
  }

  .ref {
    margin-bottom: 6px;
    color: var(--fg-faint);
    font-family: var(--font-code);
    font-size: var(--fs-xs);
    word-break: break-all;
  }

  blockquote {
    margin: 4px 0 8px;
    padding: 6px 10px;
    overflow: auto;
    max-height: 90px;
    border-left: 3px solid var(--accent);
    background: var(--bg-code);
    color: var(--fg-code);
    font-family: var(--font-code);
    font-size: var(--fs-xs);
    line-height: 1.5;
    white-space: pre;
    word-break: normal;
    overflow-wrap: normal;
  }

  blockquote :global(span[style]) {
    background: transparent !important;
  }

  .qline {
    display: block;
    min-height: 1.5em;
    white-space: pre;
  }

  textarea {
    width: 100%;
    min-height: 72px;
    padding: 8px 10px;
    resize: vertical;
    border: var(--border-w) solid var(--border);
    background: var(--bg-panel);
    color: var(--fg);
    font-size: var(--fs-sm);
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 10px;
  }

  .actions button {
    height: 30px;
    padding: 0 12px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    color: var(--fg);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    box-shadow: var(--shadow-btn);
  }

  .actions button:hover {
    background: var(--bg-hover);
  }

  .actions .save {
    background: var(--accent);
    color: var(--accent-fg);
  }

  .actions .save:hover {
    background: var(--accent-hover);
  }

  .actions button:active {
    transform: translate(1px, 1px);
    box-shadow: none;
  }
</style>
