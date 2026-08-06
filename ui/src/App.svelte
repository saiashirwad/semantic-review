<script lang="ts">
  import { onMount } from "svelte";
  import type { ReviewPayload } from "../../src/payload.ts";
  import { ReviewState, provideReviewState } from "./state.svelte.ts";
  import ProgressHeader from "./components/ProgressHeader.svelte";
  import Sidebar from "./components/Sidebar.svelte";
  import FilesRail from "./components/FilesRail.svelte";
  import SectionCard from "./components/SectionCard.svelte";
  import FullDiff from "./components/FullDiff.svelte";
  import BugsRail from "./components/BugsRail.svelte";
  import CommentComposer from "./components/CommentComposer.svelte";
  import SelectionBubble from "./components/SelectionBubble.svelte";
  import NotesCard from "./components/NotesCard.svelte";
  import Diagram from "./components/Diagram.svelte";
  import Finished from "./components/Finished.svelte";
  import FindingPopover from "./components/FindingPopover.svelte";
  import Prose from "./components/Prose.svelte";
  import SeverityRuler from "./components/SeverityRuler.svelte";
  import KeymapOverlay from "./components/KeymapOverlay.svelte";
  import MarginNotes from "./components/MarginNotes.svelte";

  const { payload }: { payload: ReviewPayload } = $props();
  // The payload is embedded in the page and never changes after mount.
  // svelte-ignore state_referenced_locally
  const review = new ReviewState(payload);
  provideReviewState(review);

  // One global finding popover — DiffViews only set the flag anchors; mounting
  // a popover in every excerpt + full-diff copy of a hunk created duplicates.
  const openFindingEntry = $derived(
    review.openFinding
      ? review.sortedFindings.find(({ key }) => key === review.openFinding) ?? null
      : null,
  );

  const stats = $derived(review.lineStats);
  let booting = $state(true);
  let mastheadEl = $state<HTMLElement | null>(null);

  function isEditableTarget(t: EventTarget | null): boolean {
    if (!(t instanceof Element)) return false;
    if (t.closest("input, textarea, select, [contenteditable=true], [contenteditable='']")) return true;
    return false;
  }

  onMount(() => {
    // Pierre SSR core CSS (shared once). Authored for :host (shadow); payload
    // already rewrites to .pierre-host, but normalize again for safety.
    if (payload.pierre?.css && !document.getElementById("pierre-diffs-css")) {
      const style = document.createElement("style");
      style.id = "pierre-diffs-css";
      style.textContent = payload.pierre.css
        .replace(/:host\b/g, ".pierre-host")
        .replace(/\.pierre-host\(([^)]*)\)/g, ".pierre-host:is($1)");
      document.head.appendChild(style);
    }

    const mq = window.matchMedia("(max-width: 1119px)");
    const sync = () => review.setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);

    const bootTimer = window.setTimeout(() => {
      booting = false;
    }, 700);

    const onKey = (e: KeyboardEvent) => {
      // Esc stack: keymap → composer/finding (self) → drawer
      if (e.key === "Escape") {
        if (review.keymapOpen) {
          review.keymapOpen = false;
          e.preventDefault();
          return;
        }
        if (review.composer || review.openFinding) return;
        if (review.drawerOpen) {
          review.closeDrawers();
          e.preventDefault();
        }
        return;
      }

      if (isEditableTarget(e.target) || review.composer) return;

      if (e.key === "?") {
        review.keymapOpen = !review.keymapOpen;
        e.preventDefault();
        return;
      }

      if (e.key === "j") {
        void review.moveCursor(1);
        e.preventDefault();
        return;
      }
      if (e.key === "k") {
        void review.moveCursor(-1);
        e.preventDefault();
        return;
      }
      if (e.key === "v") {
        if (review.cursorHunk) review.toggleViewed(review.cursorHunk);
        e.preventDefault();
        return;
      }
      if (e.key === "n") {
        void review.cycleFinding(1);
        e.preventDefault();
        return;
      }
      if (e.key === "p") {
        void review.cycleFinding(-1);
        e.preventDefault();
        return;
      }
      if (e.key === "c") {
        review.openComposerOnCursor();
        e.preventDefault();
        return;
      }
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        void review.done();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(bootTimer);
    };
  });

  // Masthead → sticky title handoff
  $effect(() => {
    const el = mastheadEl;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        review.mastheadVisible = entry?.isIntersecting ?? true;
      },
      { rootMargin: `-${getComputedStyle(document.documentElement).getPropertyValue("--header-h") || "48px"} 0px 0px 0px`, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  });

  // Lock page scroll while a narrow drawer is open.
  $effect(() => {
    if (!review.drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  });
</script>

{#if review.finished}
  <Finished />
{:else}
  <div class="root" class:boot={booting}>
  <ProgressHeader />
  <div
    class="layout"
    class:narrow={review.narrow}
    class:no-left={!review.leftOpen}
    class:no-review={!review.reviewOpen}
    class:drawer-open={review.drawerOpen}
    style:--left-rail-w="{review.leftWidth}px"
  >
    <Sidebar />
    <FilesRail />
    <main>
      <div class="masthead" bind:this={mastheadEl}>
        <h1 class="mast-title">{payload.title}</h1>
        <div class="double-rule" aria-hidden="true">
          <div class="rule thick"></div>
          <div class="rule thin"></div>
        </div>
        <p class="mast-stats">
          +{stats.added} −{stats.removed} · {payload.files.length} files · {review.hunkOrder.length} hunks
        </p>
      </div>
      <div class="tldr" data-ctx="TL;DR">
        <div class="tldr-head">
          <span class="kicker">Summary</span>
          <span class="tldr-meta">{payload.changeSummary}</span>
        </div>
        <div class="tldr-body"><Prose text={review.analysis.summary} /></div>
      </div>
      <Diagram svg={review.result.diagrams.top} source={review.analysis.diagram} />
      {#each review.analysis.sections as section, i (`${review.activeResult}:${i}`)}
        <div
          class="section-wrap"
          style:animation-delay="{Math.min(i, 8) * 50 + 200}ms"
        >
          <SectionCard {section} index={i} svg={review.result.diagrams.sections[i] ?? ""} />
        </div>
      {/each}
      <NotesCard />
      <FullDiff />
      <MarginNotes />
    </main>
    {#if !review.narrow}
      <SeverityRuler />
    {/if}
    <BugsRail />
  </div>
  {#if review.drawerOpen}
    <button
      type="button"
      class="scrim"
      aria-label="Close panel"
      onclick={() => review.closeDrawers()}
    ></button>
  {/if}
  <SelectionBubble />
  <CommentComposer />
  {#if openFindingEntry}
    <FindingPopover finding={openFindingEntry.finding} key={openFindingEntry.key} />
  {/if}
  <KeymapOverlay />
  {#if review.copyError}
    <div class="copy-error" role="alert">
      {review.copyError}
      <button onclick={() => (review.copyError = "")}>✕</button>
    </div>
  {/if}
  </div>
{/if}

<style>
  /* ─── LOAD STORYBOARD ─────────────────────────────
   *   0ms  header slides down from -100% (200ms)
   * 120ms  summary card snaps up 12px → 0 (240ms)
   * 160ms  card's shadow lands (box-shadow 0 → 4px 4px, 120ms)
   * 200ms+ sections cascade, 50ms stagger (max 8 staggered, rest instant)
   * 250ms+ review-rail cards cascade, 40ms stagger
   * ────────────────────────────────────────────────── */

  .root {
    min-height: 100vh;
  }

  .layout {
    display: grid;
    /* Left = Walk XOR Files; center reading; 12px ruler; right Review */
    grid-template-columns: var(--left-rail-w, 280px) minmax(0, 1fr) 12px minmax(280px, 340px);
    align-items: stretch;
    gap: 0;
    width: 100%;
    min-height: calc(100vh - var(--header-h));
  }

  /* Wide: tuck left and/or right — main expands; keep ruler column */
  .layout.no-left:not(.narrow) {
    grid-template-columns: minmax(0, 1fr) 12px minmax(280px, 340px);
  }
  .layout.no-review:not(.narrow) {
    grid-template-columns: var(--left-rail-w, 280px) minmax(0, 1fr) 12px;
  }
  .layout.no-left.no-review:not(.narrow) {
    grid-template-columns: minmax(0, 1fr) 12px;
  }
  .layout.narrow {
    grid-template-columns: minmax(0, 1fr);
  }

  main {
    position: relative;
    min-width: 0;
    width: 100%;
    min-height: calc(100vh - var(--header-h));
    padding: var(--space-3) var(--space-3) var(--space-5);
    background: var(--bg);
  }

  /* Margin notes overlay the right edge as collapsed markers — no reserved
     gutter, the code column always gets the full width. */

  .masthead {
    margin-bottom: var(--space-4);
  }

  .mast-title {
    margin: 0 0 10px;
    font-size: 34px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  .double-rule {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: 8px;
  }

  .rule {
    height: 0;
    border: 0;
    border-bottom-style: solid;
    border-bottom-color: var(--border);
  }

  .rule.thick {
    border-bottom-width: 4px;
  }

  .rule.thin {
    border-bottom-width: 2px;
  }

  .mast-stats {
    margin: 0;
    color: var(--fg-muted);
    font-family: var(--font-code);
    font-size: var(--fs-sm);
    font-variant-numeric: tabular-nums;
  }

  .tldr {
    padding: calc(var(--space-3) + 4px) var(--space-4) var(--space-3);
    border: var(--border-w) solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-raised);
    /* Accent top bar — the page's single entry point */
    box-shadow:
      inset 0 4px 0 var(--accent),
      var(--shadow-card);
  }

  .tldr-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }

  .kicker {
    color: var(--accent);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    line-height: var(--lh-tight);
  }

  .tldr-meta {
    color: var(--fg-faint);
    font-family: var(--font-code);
    font-size: var(--fs-xs);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .tldr-body {
    width: 100%;
    max-width: none;
    font-size: var(--fs-md);
    font-weight: 500;
    line-height: var(--lh-prose);
    letter-spacing: -0.01em;
    color: var(--fg);
  }

  .tldr-body :global(p) {
    width: 100%;
    max-width: none;
  }

  /* Tight stack between main-column blocks */
  .tldr + :global(*) {
    margin-top: var(--space-3);
  }

  .section-wrap {
    animation-fill-mode: both;
  }

  /* Boot entrance — one-shot .boot on root so backend tab re-keys do not replay */
  .root.boot :global(header.progress-header) {
    animation: boot-header 200ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }

  .root.boot .tldr {
    animation:
      boot-card 240ms cubic-bezier(0.2, 0.9, 0.25, 1) 120ms both,
      boot-shadow 120ms cubic-bezier(0.2, 0.9, 0.25, 1) 160ms both;
  }

  .root.boot .section-wrap {
    animation: boot-section 240ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }

  .root.boot :global(#review-panel .card) {
    animation: boot-rail 200ms cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }

  .root.boot :global(#review-panel .findings-list .card:nth-child(1)) {
    animation-delay: 250ms;
  }
  .root.boot :global(#review-panel .findings-list .card:nth-child(2)) {
    animation-delay: 290ms;
  }
  .root.boot :global(#review-panel .findings-list .card:nth-child(3)) {
    animation-delay: 330ms;
  }
  .root.boot :global(#review-panel .findings-list .card:nth-child(4)) {
    animation-delay: 370ms;
  }
  .root.boot :global(#review-panel .findings-list .card:nth-child(5)) {
    animation-delay: 410ms;
  }
  .root.boot :global(#review-panel .findings-list .card:nth-child(6)) {
    animation-delay: 450ms;
  }
  .root.boot :global(#review-panel .findings-list .card:nth-child(7)) {
    animation-delay: 490ms;
  }
  .root.boot :global(#review-panel .findings-list .card:nth-child(8)) {
    animation-delay: 530ms;
  }

  @keyframes boot-header {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes boot-card {
    from {
      transform: translateY(12px);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes boot-shadow {
    from {
      box-shadow:
        inset 0 4px 0 var(--accent),
        0 0 0 var(--border);
    }
    to {
      box-shadow:
        inset 0 4px 0 var(--accent),
        var(--shadow-card);
    }
  }

  @keyframes boot-section {
    from {
      transform: translateY(12px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes boot-rail {
    from {
      transform: translateY(8px);
    }
    to {
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .root.boot :global(header.progress-header),
    .root.boot .tldr,
    .root.boot .section-wrap,
    .root.boot :global(#review-panel .card) {
      animation: none;
    }
  }

  /* Below sticky header so Walk / Review / Done stay usable while a drawer is open */
  .scrim {
    position: fixed;
    top: var(--header-h);
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 25;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: color-mix(in srgb, var(--fg) 35%, transparent);
    cursor: pointer;
  }

  .copy-error {
    position: fixed;
    left: 50%;
    bottom: 20px;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    transform: translateX(-50%);
    border: var(--border-w) solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-raised);
    color: var(--sev-critical);
    font-size: var(--fs-sm);
    font-weight: 600;
    box-shadow: var(--shadow-pop);
  }

  .copy-error button {
    padding: 0 4px;
    border: 0;
    background: none;
    color: var(--fg);
    font-weight: 700;
  }

  @media (max-width: 720px) {
    main {
      padding: 10px 8px 48px;
    }
  }
</style>
