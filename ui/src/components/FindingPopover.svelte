<script lang="ts">
  import type { Finding } from "../../../src/analysis";
  import { getReviewState } from "../state.svelte";
  import Prose from "./Prose.svelte";

  const { finding, key }: { finding: Finding; key: string } = $props();
  const review = getReviewState();

  const quote = $derived(review.quoteForFinding(finding));
  const quoteHtml = $derived(review.quoteHtmlForFinding(finding));

  const KIND: Record<Finding["severity"], string> = {
    critical: "Critical",
    major: "Major",
    minor: "Minor",
    info: "Note",
  };

  // Fixed to escape .hunk { overflow: hidden }. Position tracks the anchor
  // row; if the row leaves the viewport we close instead of floating orphaned.
  let el = $state<HTMLElement | null>(null);
  let pos = $state<{ left: number; top: number; maxHeight: number } | null>(null);

  const GAP = 10;
  const EDGE = 8;
  const WIDTH = 400;
  const MIN_CARD = 140;

  function headerOffset(): number {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-h").trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 48;
  }

  function rowEl(anchor: Element): HTMLElement {
    return (anchor.closest("tr") as HTMLElement | null) ?? (anchor as HTMLElement);
  }

  function rowVisible(row: HTMLElement): boolean {
    const r = row.getBoundingClientRect();
    const top = headerOffset() + EDGE;
    const bottom = window.innerHeight - EDGE;
    // Need a meaningful slice of the row on-screen
    return r.bottom > top + 20 && r.top < bottom - 20;
  }

  function place() {
    const anchor = el?.parentElement;
    if (!anchor || !el) return;

    const row = rowEl(anchor);
    if (!rowVisible(row)) {
      review.openFinding = null;
      return;
    }

    const rowRect = row.getBoundingClientRect();
    const width = Math.min(WIDTH, window.innerWidth - EDGE * 2);
    const topBound = headerOffset() + EDGE;
    const botBound = window.innerHeight - EDGE;

    const spaceBelow = botBound - rowRect.bottom - GAP;
    const spaceAbove = rowRect.top - topBound - GAP;
    const openBelow = spaceBelow >= MIN_CARD || spaceBelow >= spaceAbove;

    const maxHeight = Math.min(
      openBelow ? Math.max(spaceBelow, MIN_CARD) : Math.max(spaceAbove, MIN_CARD),
      botBound - topBound,
    );

    el.style.width = `${width}px`;
    el.style.maxHeight = `${maxHeight}px`;
    const height = el.offsetHeight;

    let top: number;
    if (openBelow) {
      top = rowRect.bottom + GAP;
      if (top + height > botBound) top = Math.max(rowRect.bottom + GAP, botBound - height);
    } else {
      top = rowRect.top - GAP - height;
      if (top < topBound) top = topBound;
    }

    // Prefer aligning to the flag/gutter, not drifting off the right edge
    const left = Math.max(EDGE, Math.min(rowRect.left, window.innerWidth - width - EDGE));

    pos = { left, top, maxHeight };
  }

  $effect(() => {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        place();
      });
    };

    // First paint: measure after layout. jumpToFinding may already have scrolled.
    requestAnimationFrame(() => {
      // If the row is still off-screen (opened via in-hunk ! without jump), nudge once.
      const anchor = el?.parentElement;
      if (anchor) {
        const row = rowEl(anchor);
        if (!rowVisible(row)) {
          row.scrollIntoView({ behavior: "instant", block: "center" });
        }
      }
      place();
    });

    const onScroll = (e: Event) => {
      // Ignore scrolling inside the popover itself (overflow-y: auto)
      if (el && e.target instanceof Node && el.contains(e.target as Node)) return;
      schedule();
    };

    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", schedule);
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
    ? `left:${pos.left}px;top:${pos.top}px;max-height:${pos.maxHeight}px;visibility:visible`
    : "visibility:hidden"}
>
  <header class="head">
    <span class="kind sev-{finding.severity}">{KIND[finding.severity]}</span>
    <span class="ref" title={review.refForFinding(finding)}>{review.refForFinding(finding)}</span>
    <button type="button" class="close" title="Close (Esc)" onclick={() => (review.openFinding = null)}>✕</button>
  </header>

  <div class="body">
    <h4>{finding.title}</h4>
    <div class="prose"><Prose text={finding.body} /></div>

    {#if quoteHtml || quote}
      <div class="quote-frame">
        <div class="quote-bar" aria-hidden="true"></div>
        {#if quoteHtml}
          <blockquote class="quote">{@html quoteHtml}</blockquote>
        {:else}
          <blockquote class="quote plain">{quote.trim()}</blockquote>
        {/if}
      </div>
    {/if}

    {#if finding.recommendation.trim()}
      <div class="rec-label">Recommendation</div>
      <div class="prose"><Prose text={finding.recommendation} /></div>
    {/if}

    <div class="actions">
      <button type="button" class="btn primary" onclick={() => review.sendFinding(key, finding)}>
        Add to review
      </button>
      <button type="button" class="btn" onclick={() => review.resolveFinding(key)}>Mark resolved</button>
    </div>
  </div>
</div>

<style>
  .popover {
    position: fixed;
    z-index: 35;
    width: min(400px, 85vw);
    overflow-x: hidden;
    overflow-y: auto;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
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
    min-height: 36px;
    padding: 0 8px 0 12px;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-panel);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .kind {
    flex-shrink: 0;
    padding: 2px 8px;
    border: var(--border-w) solid var(--border);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    box-shadow: 2px 2px 0 var(--border);
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
    min-width: 0;
    overflow: hidden;
    color: var(--fg-muted);
    font-family: var(--font-code);
    font-size: 11px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .close {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 2px solid transparent;
    background: none;
    color: var(--fg-muted);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }

  .close:hover {
    border-color: var(--border);
    background: var(--bg-hover);
    color: var(--fg);
  }

  .body {
    padding: 12px 14px 14px;
  }

  h4 {
    margin: 0 0 8px;
    color: var(--fg);
    font-size: var(--fs-md);
    font-weight: 700;
    line-height: 1.3;
  }

  .rec-label {
    margin: 12px 0 4px;
    color: var(--fg-faint);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .prose {
    color: var(--fg-muted);
    font-size: var(--fs-sm);
    line-height: 1.45;
  }

  .quote-frame {
    display: flex;
    margin: 10px 0 0;
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
    max-height: 72px;
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

  .quote.plain {
    white-space: pre-wrap;
    word-break: break-word;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
  }

  .btn {
    height: 32px;
    padding: 0 12px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    color: var(--fg);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: var(--shadow-btn);
  }

  .btn:hover {
    background: var(--bg-hover);
  }

  .btn.primary {
    background: var(--accent);
    color: var(--accent-fg);
  }

  .btn.primary:hover {
    background: var(--accent-hover);
  }

  .btn:active {
    transform: translate(1px, 1px);
    box-shadow: none;
  }
</style>
