<script lang="ts">
  import type { Finding } from "../../../src/analysis";
  import { getReviewState } from "../state.svelte";
  import { startPopoverDrag } from "../popover-drag";
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

  let el = $state<HTMLElement | null>(null);
  let pos = $state<{ left: number; top: number; maxHeight: number } | null>(null);
  let ready = $state(false);
  /** After a manual drag, stop auto-repositioning / auto-closing on scroll. */
  let userDragged = $state(false);

  const GAP = 10;
  const EDGE = 8;
  const WIDTH = 400;
  const MIN_CARD = 140;

  /** Escape overflow:hidden on .hunk by mounting on body. */
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }

  function headerOffset(): number {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-h").trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 48;
  }

  function anchorEl(): HTMLElement | null {
    const all = document.querySelectorAll<HTMLElement>(`[data-finding-line="${CSS.escape(key)}"]`);
    if (all.length === 0) return null;
    // Prefer an on-screen anchor when the same finding is flagged in multiple DiffViews
    for (const a of all) {
      const r = a.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) return a;
    }
    return all[0];
  }

  function rowEl(anchor: Element): HTMLElement {
    return (anchor.closest("tr") as HTMLElement | null) ?? (anchor as HTMLElement);
  }

  function rowVisible(row: HTMLElement): boolean {
    const r = row.getBoundingClientRect();
    const top = headerOffset() + EDGE;
    const bottom = window.innerHeight - EDGE;
    return r.bottom > top + 12 && r.top < bottom - 12;
  }

  function place(opts: { closeIfOffscreen?: boolean } = {}) {
    if (!el) return;
    // User took over placement — leave the card where they put it
    if (userDragged && ready) return;

    const anchor = anchorEl();
    if (!anchor) {
      if (opts.closeIfOffscreen && !userDragged) review.openFinding = null;
      return;
    }

    const row = rowEl(anchor);
    if (!rowVisible(row)) {
      if (opts.closeIfOffscreen && !userDragged) {
        review.openFinding = null;
        return;
      }
      if (userDragged) return;
      // First open: bring the line on-screen, then place next frame
      row.scrollIntoView({ behavior: "instant", block: "center" });
      requestAnimationFrame(() => place({ closeIfOffscreen: false }));
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
      openBelow ? Math.max(spaceBelow, 120) : Math.max(spaceAbove, 120),
      botBound - topBound,
    );

    el.style.width = `${width}px`;
    el.style.maxHeight = `${maxHeight}px`;
    // Force layout so offsetHeight is real (was 0 while visibility:hidden)
    void el.offsetHeight;
    const height = Math.min(el.scrollHeight, maxHeight) || MIN_CARD;

    let top: number;
    if (openBelow) {
      top = rowRect.bottom + GAP;
      if (top + height > botBound) top = Math.max(topBound, botBound - height);
    } else {
      top = rowRect.top - GAP - height;
      if (top < topBound) top = topBound;
    }

    const left = Math.max(EDGE, Math.min(rowRect.left, window.innerWidth - width - EDGE));
    pos = { left, top, maxHeight };
    ready = true;
  }

  $effect(() => {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        place({ closeIfOffscreen: true });
      });
    };

    // Two frames: portal + bind:this settle, then measure
    requestAnimationFrame(() => {
      requestAnimationFrame(() => place({ closeIfOffscreen: false }));
    });

    const onScroll = (e: Event) => {
      if (el && e.target instanceof Node && el.contains(e.target)) return;
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

  function onDragStart(e: PointerEvent) {
    if (!pos || !el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    startPopoverDrag(
      e,
      pos,
      (p) => {
        userDragged = true;
        pos = { ...p, maxHeight: pos?.maxHeight ?? 400 };
      },
      { mode: "fixed", width: w, height: h },
    );
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === "Escape") review.openFinding = null;
  }
</script>

<svelte:window {onkeydown} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_interactive_supports_focus a11y_click_events_have_key_events -->
<div
  class="popover"
  class:ready
  role="dialog"
  aria-label={finding.title}
  tabindex="-1"
  use:portal
  bind:this={el}
  style={pos
    ? `left:${pos.left}px;top:${pos.top}px;max-height:${pos.maxHeight}px`
    : undefined}
  onclick={(e) => e.stopPropagation()}
  onmousedown={(e) => e.stopPropagation()}
>
  <header class="head">
    <button
      type="button"
      class="grip"
      title="Drag to move"
      aria-label="Drag to move"
      onpointerdown={onDragStart}
    >
      <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
        <circle cx="3" cy="2" r="1.4" fill="currentColor" />
        <circle cx="9" cy="2" r="1.4" fill="currentColor" />
        <circle cx="3" cy="7" r="1.4" fill="currentColor" />
        <circle cx="9" cy="7" r="1.4" fill="currentColor" />
        <circle cx="3" cy="12" r="1.4" fill="currentColor" />
        <circle cx="9" cy="12" r="1.4" fill="currentColor" />
      </svg>
    </button>
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
    z-index: 50;
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
    /* Hidden until first successful place — avoid flash at 0,0 */
    opacity: 0;
    pointer-events: none;
  }

  .popover.ready {
    opacity: 1;
    pointer-events: auto;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 0 8px 0 6px;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-panel);
    position: sticky;
    top: 0;
    z-index: 1;
    user-select: none;
  }

  .grip {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin: 0;
    padding: 0;
    border: 2px solid transparent;
    background: transparent;
    color: var(--fg-faint);
    cursor: grab;
    touch-action: none;
  }

  .grip:hover {
    border-color: var(--border);
    background: var(--bg-hover);
    color: var(--fg);
  }

  .grip:global(.dragging),
  .grip:active {
    cursor: grabbing;
    border-color: var(--border);
    background: var(--bg-hover);
    color: var(--fg);
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
