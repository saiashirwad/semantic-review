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
    margin-top: 40px;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .num {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 11.5px;
    font-weight: 600;
    line-height: 20px;
    text-align: center;
  }

  .intro {
    color: var(--fg-muted);
    font-size: 13.5px;
  }

  .note {
    margin: -4px 0 16px;
    color: var(--fg-muted);
    font-size: 12.5px;
  }

  .missing {
    color: var(--fg-faint);
    font-size: 13px;
    font-style: italic;
  }
</style>
