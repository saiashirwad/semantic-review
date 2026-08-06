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
        <span class="kicker">Summary</span>
        <div class="tldr-body"><Prose text={review.analysis.summary} /></div>
        <p class="change-summary">{payload.changeSummary}</p>
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
    grid-template-columns: 240px minmax(0, 1fr) 320px;
    align-items: start;
    max-width: 1600px;
    margin: 0 auto;
  }

  main {
    max-width: 860px;
    min-width: 0;
    padding: 28px 32px 120px;
  }

  .tldr {
    padding: 16px 18px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
  }

  .kicker {
    display: block;
    margin-bottom: 4px;
    color: var(--accent);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .tldr-body {
    font-size: 14px;
  }

  .change-summary {
    margin: 8px 0 0;
    color: var(--fg-faint);
    font-size: 12px;
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
    border-radius: var(--radius);
    background: var(--bg-raised);
    color: var(--sev-critical);
    font-size: 13px;
    box-shadow: var(--shadow-pop);
  }

  .copy-error button {
    padding: 0;
    border: 0;
    background: none;
    color: var(--fg-faint);
  }

  @media (max-width: 1100px) {
    .layout {
      grid-template-columns: minmax(0, 1fr) 300px;
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
      padding: 20px 14px 64px;
    }
  }
</style>
