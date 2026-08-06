<script lang="ts">
  import type { ReviewPayload } from "../../src/payload";
  import { ReviewState, provideReviewState } from "./state.svelte";
  import ProgressHeader from "./components/ProgressHeader.svelte";
  import Sidebar from "./components/Sidebar.svelte";
  import SectionCard from "./components/SectionCard.svelte";
  import FullDiff from "./components/FullDiff.svelte";
  import BugsRail from "./components/BugsRail.svelte";
  import CommentComposer from "./components/CommentComposer.svelte";
  import SelectionBubble from "./components/SelectionBubble.svelte";
  import NotesCard from "./components/NotesCard.svelte";
  import Diagram from "./components/Diagram.svelte";
  import Finished from "./components/Finished.svelte";
  import Prose from "./components/Prose.svelte";

  const { payload }: { payload: ReviewPayload } = $props();
  // The payload is embedded in the page and never changes after mount.
  // svelte-ignore state_referenced_locally
  const review = new ReviewState(payload);
  provideReviewState(review);
</script>

{#if review.finished}
  <Finished />
{:else}
  <ProgressHeader />
  <div class="layout">
    <Sidebar />
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
  <SelectionBubble />
  <CommentComposer />
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
    grid-template-columns: 240px minmax(0, 1fr) minmax(340px, 420px);
    align-items: start;
    gap: 0 12px;
    max-width: 1680px;
    margin: 0 auto;
    width: 100%;
  }

  main {
    min-width: 0;
    width: 100%;
    padding: 20px 16px 96px;
  }

  .tldr {
    padding: 16px 18px 18px;
    border: var(--border-w) solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
  }

  .tldr-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .kicker {
    color: var(--accent);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .tldr-meta {
    color: var(--fg-faint);
    font-family: var(--font-code);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .tldr-body {
    font-size: var(--fs-md);
    font-weight: 500;
    line-height: 1.75;
    color: var(--fg);
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

  @media (max-width: 1100px) {
    .layout {
      grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
    }
    .layout > :global(nav.sidebar) {
      display: none;
    }
  }

  @media (max-width: 800px) {
    .layout {
      display: block;
    }
    main {
      padding: 14px 12px 64px;
    }
  }
</style>
