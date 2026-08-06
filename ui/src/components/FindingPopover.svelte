<script lang="ts">
  import type { Finding } from "../../../src/analysis";
  import { getReviewState } from "../state.svelte";
  import { startPopoverDrag } from "../popover-drag";
  import {
    computePopoverPos,
    headerOffsetPx,
    pickVisibleAnchor,
    rowVisible,
    POPOVER_EDGE,
  } from "../popover-place";
  import CodeQuote from "./CodeQuote.svelte";
  import DragGrip from "./DragGrip.svelte";
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

  /** Escape overflow:hidden on .hunk by mounting on body. */
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }

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

<!-- Stop outside handlers from treating popover clicks as dismissals. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
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
    <DragGrip onpointerdown={onDragStart} />
    <span class="kind sev-{finding.severity}">{KIND[finding.severity]}</span>
    <span class="ref" title={ref}>{ref}</span>
    <button type="button" class="close" title="Close (Esc)" onclick={() => (review.openFinding = null)}>✕</button>
  </header>

  <div class="body">
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

  .body :global(.quote-frame) {
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
