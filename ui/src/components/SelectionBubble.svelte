<script lang="ts">
  import { getReviewState } from "../state.svelte";

  const review = getReviewState();

  let pos = $state<{ left: number; top: number } | null>(null);

  function onmouseup(e: MouseEvent) {
    const target = e.target as Element;
    if (target.closest(".composer") || target.closest(".bubble")) return;
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        pos = null;
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      pos = { left: Math.max(8, rect.left + window.scrollX), top: rect.bottom + window.scrollY + 6 };
    }, 0);
  }

  function comment() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const quote = sel.toString().trim();
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    let node: Node | null = sel.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const el = node as Element | null;
    const td = el?.closest?.("[data-ref]") as HTMLElement | null;
    const section = el?.closest?.("[data-ctx]") as HTMLElement | null;
    const ref = td?.dataset.ref ?? (section ? `§ ${section.dataset.ctx}` : "report");
    // For diff selections, rebuild the quote from the touched lines' clean
    // text (the raw DOM selection would include gutter +/− and flag markers)
    // and carry their highlighted HTML.
    const table = td?.closest("table");
    const cells = table
      ? [...table.querySelectorAll<HTMLElement>("td[data-html]")].filter((cell) => range.intersectsNode(cell))
      : [];
    const cleanQuote = cells.length > 0 ? cells.map((cell) => cell.dataset.text ?? "").join("\n") : quote;
    const html = cells.length > 0 ? cells.map((cell) => cell.dataset.html!).join("\n") : undefined;
    pos = null;
    sel.removeAllRanges();
    review.openComposer(ref, cleanQuote, {
      html,
      anchor: { left: rect.left + window.scrollX, top: rect.bottom + window.scrollY },
    });
  }
</script>

<svelte:document {onmouseup} />

{#if pos}
  <button class="bubble" style="left: {pos.left}px; top: {pos.top}px" onclick={comment}>Comment</button>
{/if}

<style>
  .bubble {
    position: absolute;
    z-index: 30;
    height: 26px;
    padding: 0 12px;
    border: 0;
    border-radius: var(--radius-sm);
    background: var(--accent);
    color: var(--accent-fg);
    font-size: 12px;
    font-weight: 600;
    box-shadow: var(--shadow-pop);
  }

  .bubble:hover {
    background: var(--accent-hover);
  }
</style>
