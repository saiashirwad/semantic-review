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

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Esc stack: composer → finding popover → drawer (composer/popover handle themselves when focused)
      if (review.composer || review.openFinding) return;
      if (review.drawerOpen) {
        review.closeDrawers();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("keydown", onKey);
    };
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
  <ProgressHeader />
  <div
    class="layout"
    class:narrow={review.narrow}
    class:no-left={!review.leftOpen}
    class:no-review={!review.reviewOpen}
    class:drawer-open={review.drawerOpen}
  >
    <Sidebar />
    <FilesRail />
    <main>
      <div class="tldr" data-ctx="TL;DR">
        <div class="tldr-head">
          <span class="kicker">Summary</span>
          <span class="tldr-meta">{payload.changeSummary}</span>
        </div>
        <div class="tldr-body"><Prose text={review.analysis.summary} /></div>
      </div>
      <Diagram svg={review.result.diagrams.top} source={review.analysis.diagram} />
      {#each review.analysis.sections as section, i (`${review.activeResult}:${i}`)}
        <SectionCard {section} index={i} svg={review.result.diagrams.sections[i] ?? ""} />
      {/each}
      <NotesCard />
      <FullDiff />
    </main>
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
  {#if review.copyError}
    <div class="copy-error" role="alert">
      {review.copyError}
      <button onclick={() => (review.copyError = "")}>✕</button>
    </div>
  {/if}
{/if}

<style>
  .layout {
    display: grid;
    /* Left = Walk XOR Files; center reading; right Review — full bleed, zero gap */
    grid-template-columns: 220px minmax(0, 1fr) minmax(280px, 340px);
    align-items: stretch;
    gap: 0;
    width: 100%;
    min-height: calc(100vh - var(--header-h));
  }

  /* Wide: tuck left and/or right — main expands */
  .layout.no-left:not(.narrow) {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
  }
  .layout.no-review:not(.narrow) {
    grid-template-columns: 220px minmax(0, 1fr);
  }
  .layout.no-left.no-review:not(.narrow),
  .layout.narrow {
    grid-template-columns: minmax(0, 1fr);
  }

  main {
    min-width: 0;
    width: 100%;
    min-height: calc(100vh - var(--header-h));
    padding: var(--space-3) var(--space-3) var(--space-5);
    background: var(--bg);
  }

  .tldr {
    padding: var(--space-3) var(--space-4);
    border: var(--border-w) solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
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
