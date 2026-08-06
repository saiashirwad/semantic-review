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
        <aside class="note">
          <span class="note-kicker">Note</span>
          <div class="note-body"><Prose text={snippet.note} /></div>
        </aside>
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

  /* Bridge caption between code excerpts — hard card, not a soft callout */
  .note {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 10px 0 16px;
    padding: 0;
    overflow: hidden;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
  }

  .note-kicker {
    flex-shrink: 0;
    align-self: stretch;
    display: grid;
    place-items: center;
    min-width: 52px;
    padding: 10px 8px;
    border-right: var(--border-w) solid var(--border);
    background: var(--accent);
    color: var(--accent-fg);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    line-height: 1.2;
  }

  .note-body {
    flex: 1;
    min-width: 0;
    padding: 10px 14px 10px 0;
    color: var(--fg);
    font-size: var(--fs-sm);
    font-weight: 500;
    line-height: 1.45;
  }

  .note-body :global(p) {
    margin: 0;
  }

  .missing {
    color: var(--fg-faint);
    font-size: var(--fs-sm);
  }
</style>
