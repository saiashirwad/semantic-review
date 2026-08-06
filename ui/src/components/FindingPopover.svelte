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

  // The anchor (.flag-anchor) sits inside a hunk card with overflow:hidden,
  // so the popover uses fixed positioning measured from the anchor to escape
  // the card's clipping. Re-measured on scroll/resize (capture catches
  // scrolling containers too).
  let el = $state<HTMLElement | null>(null);
  let pos = $state<{ left: number; top: number } | null>(null);

  function place() {
    const anchor = el?.parentElement;
    if (!anchor || !el) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(420, window.innerWidth * 0.8);
    const height = el.offsetHeight;
    // Open below the flagged line; flip above when there is no room, and
    // clamp into the viewport either way so it never renders off-screen.
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - 8) top = rect.top - height - 6;
    top = Math.max(8, Math.min(top, window.innerHeight - height - 8));
    pos = {
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      top,
    };
  }

  $effect(() => {
    place();
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
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
  style={pos ? `left: ${pos.left}px; top: ${pos.top}px; visibility: visible` : "visibility: hidden"}
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
    width: min(420px, 80vw);
    max-height: calc(100vh - 16px);
    overflow-y: auto;
    padding: 14px 16px;
    border-radius: 10px;
    background: var(--bg-raised);
    box-shadow: var(--shadow-pop);
    font: var(--font-sans);
    white-space: normal;
    word-break: normal;
    text-align: left;
    cursor: auto;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .kind {
    padding: 2px 8px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }

  .sev-critical {
    background: color-mix(in srgb, var(--sev-critical) 12%, transparent);
    color: var(--sev-critical);
  }
  .sev-major {
    background: color-mix(in srgb, var(--sev-major) 12%, transparent);
    color: var(--sev-major);
  }
  .sev-minor {
    background: color-mix(in srgb, var(--sev-minor) 14%, transparent);
    color: var(--sev-minor);
  }
  .sev-info {
    background: color-mix(in srgb, var(--sev-info) 14%, transparent);
    color: var(--sev-info);
  }

  .ref {
    flex: 1;
    overflow: hidden;
    color: var(--fg-faint);
    font: var(--font-mono);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .close {
    padding: 2px;
    border: 0;
    border-radius: 4px;
    background: none;
    color: var(--fg-faint);
    font-size: 12px;
    line-height: 1;
  }

  .close:hover {
    background: var(--bg-hover);
    color: var(--fg);
  }

  h4 {
    margin: 0 0 6px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .rec-label {
    margin: 12px 0 4px;
    color: var(--fg-faint);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .prose {
    color: var(--fg-muted);
    font-size: 13px;
  }

  blockquote {
    margin: 10px 0;
    padding: 6px 10px;
    overflow: auto;
    max-height: 90px;
    border-left: 2px solid var(--accent);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    background: var(--bg-inset);
    font: var(--font-mono);
    font-size: 11.5px;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
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

  .actions .primary {
    border-color: transparent;
    background: var(--accent);
    color: var(--accent-fg);
    font-weight: 600;
  }

  .actions .primary:hover {
    background: var(--accent-hover);
  }
</style>
