<script lang="ts">
  import { getReviewState } from "../state.svelte.ts";

  const review = getReviewState();

  let pos = $state<{ left: number; top: number } | null>(null);
  let lineCount = $state(1);
  // Document coords where the pointer released — bubble + composer open here.
  let pointer = $state<{ left: number; top: number } | null>(null);

  const BUBBLE_W = 140; // approx width for edge clamping
  const BUBBLE_H = 34;

  function measureSelection(): {
    quote: string;
    html?: string;
    ref: string;
    rect: DOMRect;
    lines: number;
  } | null {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return null;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    // Prefer the end of the selection (where the drag finished)
    let node: Node | null = sel.focusNode ?? sel.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const el = node as Element | null;
    const td = el?.closest?.("td[data-hunk][data-idx]") as HTMLElement | null;
    const section = el?.closest?.("[data-ctx]") as HTMLElement | null;

    const table = td?.closest("table");
    const cells = table
      ? [...table.querySelectorAll<HTMLElement>("td[data-hunk][data-idx]")].filter((cell) =>
          range.intersectsNode(cell),
        )
      : [];

    if (cells.length > 0) {
      const payloadLines = cells
        .map((cell) => review.lineAt(cell.dataset.hunk!, Number(cell.dataset.idx)))
        .filter((l): l is NonNullable<typeof l> => l != null);
      if (payloadLines.length === 0) return null;
      const first = cells[0];
      const ref = review.refForLine(first.dataset.hunk!, Number(first.dataset.idx));
      return {
        quote: payloadLines.map((l) => l.text).join("\n"),
        html: payloadLines.map((l) => l.html).join("\n"),
        ref,
        rect,
        lines: payloadLines.length,
      };
    }

    const ref = td
      ? review.refForLine(td.dataset.hunk!, Number(td.dataset.idx))
      : section
        ? `§ ${section.dataset.ctx}`
        : "report";
    const quote = sel.toString().trim();
    return {
      quote,
      ref,
      rect,
      lines: Math.max(1, quote.split("\n").filter((l) => l.length > 0).length),
    };
  }

  function clampPos(left: number, top: number): { left: number; top: number } {
    const maxL = window.scrollX + document.documentElement.clientWidth - BUBBLE_W - 8;
    const maxT = window.scrollY + document.documentElement.clientHeight - BUBBLE_H - 8;
    return {
      left: Math.max(window.scrollX + 8, Math.min(left, maxL)),
      top: Math.max(window.scrollY + 8, Math.min(top, maxT)),
    };
  }

  function onmouseup(e: MouseEvent) {
    const target = e.target as Element;
    if (target.closest(".composer") || target.closest(".bubble") || target.closest(".float")) return;
    // Capture pointer immediately — selection resolve is deferred a tick
    const mouse = {
      left: e.clientX + window.scrollX,
      top: e.clientY + window.scrollY + 12, // just under the cursor
    };
    setTimeout(() => {
      const measured = measureSelection();
      if (!measured) {
        pos = null;
        pointer = null;
        lineCount = 1;
        return;
      }
      lineCount = measured.lines;
      pointer = mouse;
      pos = clampPos(mouse.left, mouse.top);
    }, 0);
  }

  function comment() {
    const measured = measureSelection();
    if (!measured) return;
    const sel = window.getSelection();
    const anchor = pointer ?? pos;
    pos = null;
    pointer = null;
    sel?.removeAllRanges();
    review.openComposer(measured.ref, measured.quote, {
      html: measured.html,
      anchor: anchor
        ? { left: anchor.left, top: anchor.top }
        : {
            left: measured.rect.left + window.scrollX,
            top: measured.rect.bottom + window.scrollY,
          },
    });
  }

  function dismiss(e: MouseEvent) {
    const target = e.target as Element;
    if (target.closest(".bubble") || target.closest(".composer") || target.closest(".float")) return;
    if (pos) {
      pos = null;
      pointer = null;
    }
  }
</script>

<svelte:document onmouseup={onmouseup} onmousedown={dismiss} />

{#if pos}
  <button type="button" class="bubble" style="left: {pos.left}px; top: {pos.top}px" onclick={comment}>
    <span class="plus" aria-hidden="true">+</span>
    <span class="label">Comment</span>
    {#if lineCount > 1}
      <span class="meta">{lineCount}</span>
    {/if}
  </button>
{/if}

<style>
  .bubble {
    position: absolute;
    z-index: 30;
    display: inline-flex;
    align-items: stretch;
    height: 34px;
    padding: 0;
    overflow: hidden;
    border: var(--border-w) solid var(--border);
    background: var(--accent);
    color: var(--accent-fg);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    box-shadow: var(--shadow-pop);
    white-space: nowrap;
    cursor: pointer;
  }

  .bubble:hover {
    background: var(--accent-hover);
  }

  .bubble:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }

  .plus {
    display: grid;
    place-items: center;
    width: 34px;
    border-right: var(--border-w) solid var(--border);
    background: color-mix(in srgb, #000 16%, transparent);
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
  }

  .label {
    display: grid;
    place-items: center;
    padding: 0 12px;
  }

  .meta {
    display: grid;
    place-items: center;
    min-width: 28px;
    padding: 0 8px;
    border-left: var(--border-w) solid var(--border);
    background: var(--fg);
    color: var(--bg-raised);
    font-family: var(--font-code);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0;
    font-variant-numeric: tabular-nums;
  }
</style>
