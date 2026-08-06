<script lang="ts">
  import { onMount, tick } from "svelte";
  import { findingAnchorId, getReviewState } from "../state.svelte.ts";

  const review = getReviewState();

  type Tick = {
    id: string;
    pct: number;
    kind: "finding" | "comment";
    severity?: string;
    label: string;
    ref: string;
    /** Source anchor element — hover highlights its row. */
    el: Element;
    onClick: () => void;
  };

  let ticks = $state<Tick[]>([]);
  let winTop = $state(0);
  let winH = $state(0.1);
  let trackEl = $state<HTMLElement | null>(null);
  /** Tick under the pointer / keyboard focus — drives the flyout card. */
  let hover = $state<Tick | null>(null);

  function scrollFraction(): { top: number; height: number } {
    const sh = Math.max(1, document.documentElement.scrollHeight);
    const ih = window.innerHeight;
    return {
      top: window.scrollY / sh,
      height: Math.min(1, ih / sh),
    };
  }

  function recomputeTicks() {
    const sh = Math.max(1, document.documentElement.scrollHeight);
    const next: Tick[] = [];

    for (const { finding, key } of review.sortedFindings) {
      if (!review.isFindingOpen(key)) continue;
      const loc = findingAnchorId(finding);
      const el = document.querySelector(`[data-finding-anchor="${CSS.escape(loc)}"]`);
      if (!el) continue;
      const y = el.getBoundingClientRect().top + window.scrollY;
      next.push({
        id: `f-${key}`,
        pct: (y / sh) * 100,
        kind: "finding",
        severity: finding.severity,
        label: finding.title,
        ref: review.refForFinding(finding),
        el,
        onClick: () => void review.jumpToFinding(key),
      });
    }

    review.comments.forEach((comment, i) => {
      if (comment.jump?.kind !== "line") return;
      const { hunkId, idx } = comment.jump;
      const el =
        document.querySelector(`[data-hunk="${CSS.escape(hunkId)}"][data-idx="${idx}"]`) ??
        document.querySelector(`td[data-hunk="${CSS.escape(hunkId)}"][data-idx="${idx}"]`);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY;
      next.push({
        id: `c-${i}`,
        pct: (y / sh) * 100,
        kind: "comment",
        label: comment.text.slice(0, 80) || "Comment",
        ref: comment.ref,
        el,
        onClick: () => void review.jumpToComment(comment),
      });
    });

    ticks = next;
  }

  function updateWindow() {
    const w = scrollFraction();
    winTop = w.top * 100;
    winH = w.height * 100;
  }

  function onTrackClick(e: MouseEvent) {
    if (!trackEl) return;
    if ((e.target as Element).closest(".tick")) return;
    const rect = trackEl.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const sh = document.documentElement.scrollHeight;
    window.scrollTo({ top: frac * sh - window.innerHeight / 2, behavior: "instant" });
  }

  onMount(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        updateWindow();
      });
    };
    updateWindow();
    void tick().then(recomputeTicks);

    const onResize = () => {
      updateWindow();
      recomputeTicks();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const interval = window.setInterval(recomputeTicks, 600);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.clearInterval(interval);
      if (raf) cancelAnimationFrame(raf);
    };
  });

  $effect(() => {
    void review.findingsIndex;
    // Iterate so array pushes re-trigger (bare read tracks only reassignment)
    for (const c of review.comments) void c.jump;
    void review.activeResult;
    void tick().then(recomputeTicks);
  });

  // Hovering a tick highlights the row it points at.
  $effect(() => {
    const t = hover;
    if (!t) return;
    const row = t.el.closest("tr") ?? t.el.closest("[data-line]") ?? t.el;
    row.classList.add("peek-line");
    return () => row.classList.remove("peek-line");
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="ruler"
  bind:this={trackEl}
  role="navigation"
  aria-label="Severity minimap"
  onclick={onTrackClick}
>
  <div class="viewport" style:top="{winTop}%" style:height="{winH}%"></div>
  {#each ticks as t (t.id)}
    <button
      type="button"
      class="tick {t.kind}"
      class:sev-critical={t.severity === "critical"}
      class:sev-major={t.severity === "major"}
      class:sev-minor={t.severity === "minor"}
      class:sev-info={t.severity === "info"}
      style:top="{t.pct}%"
      aria-label={t.label}
      onmouseenter={() => (hover = t)}
      onmouseleave={() => (hover = null)}
      onfocus={() => (hover = t)}
      onblur={() => (hover = null)}
      onclick={(e) => {
        e.stopPropagation();
        t.onClick();
      }}
    ></button>
  {/each}
  {#if hover}
    <div class="fly" style:top="clamp(32px, {hover.pct}%, calc(100% - 32px))">
      <span
        class="fly-sev"
        class:comment={hover.kind === "comment"}
        class:sev-critical={hover.severity === "critical"}
        class:sev-major={hover.severity === "major"}
        class:sev-minor={hover.severity === "minor"}
        class:sev-info={hover.severity === "info"}
      ></span>
      <span class="fly-text">
        <span class="fly-title">{hover.label}</span>
        <span class="fly-ref">{hover.ref}</span>
      </span>
    </div>
  {/if}
</div>

<style>
  .ruler {
    position: sticky;
    top: var(--header-h);
    height: calc(100vh - var(--header-h));
    width: 12px;
    border-left: var(--border-w) solid var(--border);
    background: var(--bg-inset);
    z-index: 5;
    cursor: pointer;
  }

  .viewport {
    position: absolute;
    left: 0;
    right: 0;
    border: 2px solid color-mix(in srgb, var(--fg) 45%, transparent);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    pointer-events: none;
    box-sizing: border-box;
  }

  /* 3px visible band inside a 11px hit target — transparent borders pad the
     hover zone without fattening the mark (background-clip keeps paint inside). */
  .tick {
    position: absolute;
    left: 0;
    right: 0;
    height: 11px;
    margin: 0;
    padding: 0;
    border: 4px solid transparent;
    border-left: 0;
    border-right: 0;
    border-radius: 0;
    background-clip: padding-box;
    transform: translateY(-50%);
    cursor: pointer;
  }

  .tick.finding.sev-critical {
    background-color: var(--sev-critical);
  }
  .tick.finding.sev-major {
    background-color: var(--sev-major);
  }
  .tick.finding.sev-minor {
    background-color: var(--sev-minor);
  }
  .tick.finding.sev-info {
    background-color: var(--sev-info);
  }

  .tick.comment {
    background-color: var(--fg);
  }

  .tick:hover,
  .tick:focus-visible {
    border-top-width: 2px;
    border-bottom-width: 2px;
  }

  /* Flyout card — hard popover sliding out left of the track */
  .fly {
    position: absolute;
    right: calc(100% + 8px);
    z-index: 30;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    width: 260px;
    padding: 8px 10px;
    transform: translateY(-50%);
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-pop);
    pointer-events: none;
    text-align: left;
  }

  .fly-sev {
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    margin-top: 4px;
    border: 1px solid var(--border);
  }

  .fly-sev.sev-critical {
    background: var(--sev-critical);
  }
  .fly-sev.sev-major {
    background: var(--sev-major);
  }
  .fly-sev.sev-minor {
    background: var(--sev-minor);
  }
  .fly-sev.sev-info {
    background: var(--sev-info);
  }
  .fly-sev.comment {
    background: var(--fg);
  }

  .fly-text {
    display: block;
    min-width: 0;
  }

  .fly-title {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    font-size: var(--fs-sm);
    font-weight: 600;
    line-height: 1.35;
    color: var(--fg);
  }

  .fly-ref {
    display: block;
    margin-top: 2px;
    overflow: hidden;
    color: var(--fg-faint);
    font-family: var(--font-code);
    font-size: var(--fs-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
