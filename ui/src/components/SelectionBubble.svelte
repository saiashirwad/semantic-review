<script lang="ts">
  import { getReviewState } from "../state.svelte.ts";

  const review = getReviewState();

  /** Document coords for the bubble (pointer release); also seeds the composer. */
  let pos = $state<{ left: number; top: number } | null>(null);
  let lineCount = $state(1);

  const BUBBLE_W = 140; // approx width for edge clamping
  const BUBBLE_H = 34;

  function measureSelection(): {
    quote: string;
    html?: string;
    ref: string;
    rect: DOMRect;
    lines: number;
    jump?: { kind: "line"; hunkId: string; idx: number } | { kind: "ctx"; ctx: string };
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
    // Legacy table cells or Pierre light-DOM lines (data-hunk + data-idx from PierreDiff)
    const lineEl = el?.closest?.("[data-hunk][data-idx]") as HTMLElement | null;
    const section = el?.closest?.("[data-ctx]") as HTMLElement | null;

    const scope =
      lineEl?.closest("table") ??
      lineEl?.closest(".pierre-host") ??
      lineEl?.closest("[data-diff]") ??
      null;
    const cells = scope
      ? [...scope.querySelectorAll<HTMLElement>("[data-hunk][data-idx]")].filter((cell) =>
          range.intersectsNode(cell),
        )
      : [];

    if (cells.length > 0) {
      const payloadLines = cells
        .map((cell) => review.lineAt(cell.dataset.hunk!, Number(cell.dataset.idx)))
        .filter((l): l is NonNullable<typeof l> => l != null);
      if (payloadLines.length === 0) return null;
      const first = cells[0];
      const hunkId = first.dataset.hunk!;
      const idx = Number(first.dataset.idx);
      const ref = review.refForLine(hunkId, idx);
      return {
        quote: payloadLines.map((l) => l.text).join("\n"),
        html: payloadLines.map((l) => l.html).join("\n"),
        ref,
        rect,
        lines: payloadLines.length,
        jump: { kind: "line", hunkId, idx },
      };
    }

    if (lineEl) {
      const hunkId = lineEl.dataset.hunk!;
      const idx = Number(lineEl.dataset.idx);
      return {
        quote: sel.toString().trim(),
        ref: review.refForLine(hunkId, idx),
        rect,
        lines: Math.max(1, sel.toString().trim().split("\n").filter((l) => l.length > 0).length),
        jump: { kind: "line", hunkId, idx },
      };
    }

    const quote = sel.toString().trim();
    if (section?.dataset.ctx) {
      return {
        quote,
        ref: `§ ${section.dataset.ctx}`,
        rect,
        lines: Math.max(1, quote.split("\n").filter((l) => l.length > 0).length),
        jump: { kind: "ctx", ctx: section.dataset.ctx },
      };
    }

    return {
      quote,
      ref: "report",
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
        lineCount = 1;
        return;
      }
      lineCount = measured.lines;
      pos = clampPos(mouse.left, mouse.top);
    }, 0);
  }

  function comment() {
    const measured = measureSelection();
    if (!measured) return;
    const sel = window.getSelection();
    const anchor = pos;
    pos = null;
    sel?.removeAllRanges();
    review.openComposer(measured.ref, measured.quote, {
      html: measured.html,
      jump: measured.jump,
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
    if (pos) pos = null;
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
