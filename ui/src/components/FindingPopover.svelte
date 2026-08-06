<script lang="ts">
  import type { Finding } from "../../../src/analysis";
  import { getReviewState } from "../state.svelte";
  import Prose from "./Prose.svelte";

  const { finding, key }: { finding: Finding; key: string } = $props();
  const review = getReviewState();

  const quote = $derived(review.quoteForFinding(finding));
  const quoteHtml = $derived(review.quoteHtmlForFinding(finding));

  const KIND: Record<Finding["severity"], string> = {
    critical: "Critical bug",
    major: "Potential bug",
    minor: "Minor issue",
    info: "Note",
  };

  // The anchor (.flag-anchor) sits inside a hunk with overflow:hidden, so the
  // popover is position:fixed. Placement rules:
  //  1. Scroll the code *row* into a safe band of the viewport.
  //  2. Prefer opening below the row so the reviewed line stays visible above.
  //  3. Cap max-height to remaining space so the card never covers the row.
  //  4. Fall back above the row when there isn't room below.
  let el = $state<HTMLElement | null>(null);
  let pos = $state<{ left: number; top: number; maxHeight: number } | null>(null);
  let didInitialScroll = false;

  const MARGIN = 8;
  const GAP = 12;
  const MIN_CARD = 160;

  function rowEl(anchor: Element): HTMLElement {
    return (anchor.closest("tr") as HTMLElement | null) ?? (anchor as HTMLElement);
  }

  function place(opts: { scroll: boolean } = { scroll: false }) {
    const anchor = el?.parentElement;
    if (!anchor || !el) return;

    const row = rowEl(anchor);
    const width = Math.min(420, window.innerWidth * 0.85);

    let rowRect = row.getBoundingClientRect();
    let spaceBelow = window.innerHeight - rowRect.bottom - MARGIN - GAP;
    let spaceAbove = rowRect.top - MARGIN - GAP;
    const openBelow = spaceBelow >= MIN_CARD || spaceBelow >= spaceAbove;

    if (opts.scroll) {
      // Put the line at the top (room below for the card) or bottom (room above).
      row.scrollIntoView({ behavior: "instant", block: openBelow ? "start" : "end" });
      rowRect = row.getBoundingClientRect();
      spaceBelow = window.innerHeight - rowRect.bottom - MARGIN - GAP;
      spaceAbove = rowRect.top - MARGIN - GAP;
    }

    const avail = openBelow
      ? Math.max(MIN_CARD, window.innerHeight - rowRect.bottom - MARGIN - GAP)
      : Math.max(MIN_CARD, rowRect.top - MARGIN - GAP);
    const maxHeight = Math.min(avail, window.innerHeight - MARGIN * 2);

    // Apply max-height before measuring so height reflects the cap.
    el.style.maxHeight = `${maxHeight}px`;
    const height = el.offsetHeight;

    let top: number;
    if (openBelow) {
      top = rowRect.bottom + GAP;
      // Never slide back up over the row if the card is taller than expected.
      if (top + height > window.innerHeight - MARGIN) {
        top = Math.max(rowRect.bottom + GAP, window.innerHeight - MARGIN - height);
      }
    } else {
      top = rowRect.top - GAP - height;
      if (top < MARGIN) top = MARGIN;
      // If we'd still overlap the row, pin just above it with scrollable card.
      if (top + height > rowRect.top - GAP) {
        top = Math.max(MARGIN, rowRect.top - GAP - Math.min(height, spaceAbove));
      }
    }

    // Final overlap guard: if the card still intersects the row, force below
    // (or above) with a hard edge against the row.
    const overlaps = top < rowRect.bottom && top + height > rowRect.top;
    if (overlaps) {
      if (window.innerHeight - rowRect.bottom - MARGIN - GAP >= MIN_CARD / 2) {
        top = rowRect.bottom + GAP;
        el.style.maxHeight = `${Math.max(120, window.innerHeight - top - MARGIN)}px`;
      } else {
        el.style.maxHeight = `${Math.max(120, rowRect.top - MARGIN - GAP)}px`;
        top = Math.max(MARGIN, rowRect.top - GAP - el.offsetHeight);
      }
    }

    const left = Math.max(MARGIN, Math.min(rowRect.left, window.innerWidth - width - MARGIN));
    pos = { left, top, maxHeight: parseFloat(el.style.maxHeight) || maxHeight };
  }

  $effect(() => {
    // Initial open: scroll the line clear, then place. Later scroll/resize only re-place.
    requestAnimationFrame(() => {
      place({ scroll: !didInitialScroll });
      didInitialScroll = true;
    });
    const onScrollOrResize = () => place({ scroll: false });
    window.addEventListener("scroll", onScrollOrResize, { capture: true, passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, { capture: true });
      window.removeEventListener("resize", onScrollOrResize);
    };
  });

  function onkeydown(e: KeyboardEvent) {
    if (e.key === "Escape") review.openFinding = null;
  }
</script>

<svelte:window {onkeydown} />

<div
  class="popover"
  role="dialog"
  aria-label={finding.title}
  bind:this={el}
  style={pos
    ? `left: ${pos.left}px; top: ${pos.top}px; max-height: ${pos.maxHeight}px; visibility: visible`
    : "visibility: hidden"}
>
  <div class="head">
    <span class="kind sev-{finding.severity}">{KIND[finding.severity]}</span>
    <span class="ref">{review.refForFinding(finding)}</span>
    <button class="close" title="Close" onclick={() => (review.openFinding = null)}>✕</button>
  </div>
  <h4>{finding.title}</h4>
  <div class="prose"><Prose text={finding.body} /></div>
  {#if quoteHtml}
    <blockquote class="diff">{@html quoteHtml}</blockquote>
  {:else if quote}
    <blockquote>{quote.trim()}</blockquote>
  {/if}
  {#if finding.recommendation.trim()}
    <div class="rec-label">Recommendation</div>
    <div class="prose"><Prose text={finding.recommendation} /></div>
  {/if}
  <div class="actions">
    <button class="primary" onclick={() => review.sendFinding(key, finding)}>Add to review</button>
    <button onclick={() => review.resolveFinding(key)}>Mark resolved</button>
  </div>
</div>

<style>
  .popover {
    position: fixed;
    z-index: 30;
    width: min(420px, 85vw);
    overflow-y: auto;
    padding: 14px 16px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    /* Reset inherited light text from dark .hunk ancestors */
    color: var(--fg);
    box-shadow: var(--shadow-pop);
    font-family: var(--font-ui);
    white-space: normal;
    word-break: normal;
    text-align: left;
    cursor: auto;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .kind {
    padding: 2px 8px;
    border: 1px solid var(--border);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .sev-critical {
    background: var(--sev-critical);
    color: #fff;
  }
  .sev-major {
    background: var(--sev-major);
    color: #fff;
  }
  .sev-minor {
    background: var(--sev-minor);
    color: #111;
  }
  .sev-info {
    background: var(--sev-info);
    color: #fff;
  }

  .ref {
    flex: 1;
    overflow: hidden;
    color: var(--fg-faint);
    font-family: var(--font-code);
    font-size: var(--fs-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .close {
    padding: 0 4px;
    border: 0;
    background: none;
    color: var(--fg-muted);
    font-size: var(--fs-sm);
    font-weight: 700;
  }

  .close:hover {
    color: var(--fg);
    background: var(--bg-hover);
  }

  h4 {
    margin: 0 0 6px;
    color: var(--fg);
    font-size: var(--fs-md);
    font-weight: 700;
  }

  .rec-label {
    margin: 12px 0 4px;
    color: var(--fg-faint);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .prose {
    color: var(--fg-muted);
    font-size: var(--fs-sm);
  }

  blockquote {
    margin: 10px 0;
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

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
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

  .actions .primary {
    background: var(--accent);
    color: var(--accent-fg);
  }

  .actions .primary:hover {
    background: var(--accent-hover);
  }

  .actions button:active {
    transform: translate(1px, 1px);
    box-shadow: none;
  }
</style>
