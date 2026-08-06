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
    onClick: () => void;
  };

  let ticks = $state<Tick[]>([]);
  let winTop = $state(0);
  let winH = $state(0.1);
  let trackEl = $state<HTMLElement | null>(null);

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
    void review.comments;
    void review.activeResult;
    void tick().then(recomputeTicks);
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
      title={t.label}
      aria-label={t.label}
      onclick={(e) => {
        e.stopPropagation();
        t.onClick();
      }}
    ></button>
  {/each}
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

  .tick {
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    transform: translateY(-50%);
    cursor: pointer;
  }

  .tick.finding.sev-critical {
    background: var(--sev-critical);
  }
  .tick.finding.sev-major {
    background: var(--sev-major);
  }
  .tick.finding.sev-minor {
    background: var(--sev-minor);
  }
  .tick.finding.sev-info {
    background: var(--sev-info);
  }

  .tick.comment {
    height: 2px;
    background: var(--fg);
  }

  .tick:hover {
    height: 5px;
  }
</style>
