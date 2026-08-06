<script lang="ts">
  import { getReviewState } from "../state.svelte";

  const review = getReviewState();

  let text = $state("");
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let boxEl = $state<HTMLElement | null>(null);

  const WIDTH = 420;
  const EST_HEIGHT = 240; // estimate before first paint; corrected below

  // Anchored next to the line/selection it comments on; falls back to a
  // bottom-right dock for refs without a code anchor. Flips above the anchor
  // when the viewport has no room below, so it never lands off-screen.
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
      // Keep the anchored composer in view.
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
    border-radius: 10px;
    background: var(--bg-raised);
    box-shadow: var(--shadow-pop);
  }

  .ref {
    margin-bottom: 6px;
    color: var(--fg-faint);
    font: var(--font-mono);
    font-size: 11px;
    word-break: break-all;
  }

  blockquote {
    margin: 6px 0 8px;
    padding: 6px 10px;
    overflow: auto;
    max-height: 96px;
    border-left: 2px solid var(--accent);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    background: var(--bg-inset);
    font: var(--font-mono);
    font-size: 11.5px;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .qline {
    display: block;
    min-height: 1.6em;
  }

  textarea {
    width: 100%;
    min-height: 76px;
    padding: 8px 10px;
    resize: vertical;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    font-size: 13px;
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
    height: 28px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-raised);
    font-size: 12.5px;
    font-weight: 500;
  }

  .actions button:hover {
    background: var(--bg-hover);
  }

  .actions .save {
    border-color: transparent;
    background: var(--accent);
    color: var(--accent-fg);
    font-weight: 600;
  }

  .actions .save:hover {
    background: var(--accent-hover);
  }
</style>
