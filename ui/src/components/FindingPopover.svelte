<script lang="ts">
  import type { Finding } from "../../../src/analysis.ts";
  import { getReviewState } from "../state.svelte.ts";
  import { startPopoverDrag } from "../popover-drag.ts";
  import {
    computePopoverPos,
    headerOffsetPx,
    pickVisibleAnchor,
    rowVisible,
    POPOVER_EDGE,
  } from "../popover-place.ts";
  import CodeQuote from "./CodeQuote.svelte";
  import FloatingChrome from "./FloatingChrome.svelte";
  import Prose from "./Prose.svelte";

  const { finding, key }: { finding: Finding; key: string } = $props();
  const review = getReviewState();

  const quote = $derived(review.quoteForFinding(finding));
  const quoteHtml = $derived(review.quoteHtmlForFinding(finding));
  const ref = $derived(review.refForFinding(finding));

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

  function anchorEl(): HTMLElement | null {
    return pickVisibleAnchor(
      document.querySelectorAll<HTMLElement>(`[data-finding-line="${CSS.escape(key)}"]`),
      window.innerHeight,
    );
  }

  function rowEl(anchor: Element): HTMLElement {
    return (anchor.closest("tr") as HTMLElement | null) ?? (anchor as HTMLElement);
  }

  function place(opts: { closeIfOffscreen?: boolean } = {}) {
    if (!el) return;
    if (userDragged && ready) return;

    const anchor = anchorEl();
    if (!anchor) {
      if (opts.closeIfOffscreen && !userDragged) review.openFinding = null;
      return;
    }

    const row = rowEl(anchor);
    const rowRect = row.getBoundingClientRect();
    const headerH = headerOffsetPx();

    if (!rowVisible(rowRect, headerH, window.innerHeight)) {
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

    // Measure with a provisional max-height so scrollHeight is meaningful
    el.style.width = `${Math.min(400, window.innerWidth - POPOVER_EDGE * 2)}px`;
    el.style.maxHeight = `${window.innerHeight - headerH - POPOVER_EDGE * 2}px`;
    void el.offsetHeight;

    const placed = computePopoverPos({
      rowRect,
      contentHeight: el.scrollHeight,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      headerH,
    });

    el.style.width = `${placed.width}px`;
    el.style.maxHeight = `${placed.maxHeight}px`;
    pos = { left: placed.left, top: placed.top, maxHeight: placed.maxHeight };
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

    // Two frames: portal + bind settle, then measure
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

  const style = $derived(
    pos ? `position:fixed;left:${pos.left}px;top:${pos.top}px;max-height:${pos.maxHeight}px;z-index:50` : "position:fixed;z-index:50",
  );
</script>

<svelte:window {onkeydown} />

<FloatingChrome
  class="finding"
  ariaLabel={finding.title}
  {style}
  {ready}
  portal
  bind:el
  onclose={() => (review.openFinding = null)}
  ondragstart={onDragStart}
>
  {#snippet head()}
    <span class="kind sev-{finding.severity}">{KIND[finding.severity]}</span>
    <span class="ref" title={ref}>{ref}</span>
  {/snippet}

  <h4>{finding.title}</h4>
  <div class="prose"><Prose text={finding.body} /></div>

  <CodeQuote html={quoteHtml || undefined} quote={quote} maxHeight="72px" />

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
</FloatingChrome>

<style>
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

  :global(.float.finding .quote-frame) {
    margin-top: 10px;
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

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
  }
</style>
