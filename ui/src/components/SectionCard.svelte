<script lang="ts">
  import type { Analysis } from "../../../src/analysis";
  import { getReviewState } from "../state.svelte";
  import DiffView from "./DiffView.svelte";
  import Diagram from "./Diagram.svelte";
  import Prose from "./Prose.svelte";

  interface Props {
    section: Analysis["sections"][number];
    index: number;
    svg: string;
  }

  const { section, index, svg }: Props = $props();
  const review = getReviewState();
</script>

<section id="section-{index}" data-ctx={section.heading}>
  <h2><span class="num">{index + 1}</span>{section.heading}</h2>
  <div class="intro"><Prose text={section.intro} /></div>
  <Diagram {svg} source={section.diagram} />
  {#each section.snippets as snippet, si (si)}
    {@const entry = review.hunkIndex.get(snippet.hunk_id)}
    {#if entry}
      <DiffView
        file={entry.file}
        hunk={entry.hunk}
        range={snippet.from != null && snippet.to != null ? { from: snippet.from, to: snippet.to } : null}
      />
      {#if snippet.note.trim()}
        <div class="note"><Prose text={snippet.note} /></div>
      {/if}
    {:else}
      <p class="missing">unknown hunk {snippet.hunk_id}</p>
    {/if}
  {/each}
</section>

<style>
  section {
    margin-top: 32px;
    /* Sticky header offset for sidebar jump / scrollIntoView */
    scroll-margin-top: calc(var(--header-h) + 12px);
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 6px;
    font-size: var(--fs-lg);
    font-weight: 700;
  }

  .num {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    color: var(--fg);
    font-size: var(--fs-sm);
    font-weight: 700;
    line-height: 20px;
    text-align: center;
  }

  .intro {
    color: var(--fg-muted);
    font-size: var(--fs-md);
  }

  .note {
    margin: 0 0 12px;
    padding: 10px 12px;
    border: var(--border-w) solid var(--border);
    border-left: 4px solid var(--accent);
    background: var(--bg-panel);
    color: var(--fg-muted);
    font-size: var(--fs-sm);
  }

  .missing {
    color: var(--fg-faint);
    font-size: var(--fs-sm);
  }
</style>
