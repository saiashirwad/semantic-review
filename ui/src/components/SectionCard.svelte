<script lang="ts">
  import type { Analysis } from "../../../src/analysis.ts";
  import { getReviewState } from "../state.svelte.ts";
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
    width: 100%;
    margin-top: var(--space-4);
    /* Sticky header offset for sidebar jump / scrollIntoView */
    scroll-margin-top: calc(var(--header-h) + var(--space-2));
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 8px;
    font-size: var(--fs-lg);
    font-weight: 700;
    line-height: var(--lh-tight);
    letter-spacing: -0.02em;
  }

  .num {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    color: var(--fg);
    font-family: var(--font-code);
    font-size: 12px;
    font-weight: 700;
    line-height: 20px;
    text-align: center;
  }

  .intro {
    width: 100%;
    max-width: none;
    margin-bottom: 10px;
    color: var(--fg-muted);
    font-size: var(--fs-md);
    font-weight: 400;
    line-height: 1.55;
    letter-spacing: -0.01em;
  }

  .intro :global(p) {
    width: 100%;
    max-width: none;
    margin: 0;
  }

  /* Lighter inline code in section intros — less chip clutter above diffs */
  .intro :global(code) {
    padding: 0.08em 0.28em;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    background: var(--bg-code);
    color: #f2ede4;
    font-size: 0.86em;
    font-weight: 500;
    box-shadow: none;
  }

  /* Bridge caption between code excerpts */
  .note {
    display: flex;
    align-items: stretch;
    gap: 0;
    margin: 8px 0 12px;
    padding: 0;
    overflow: hidden;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: none;
  }

  .note-kicker {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    min-width: 48px;
    padding: 8px 6px;
    border-right: var(--border-w) solid var(--border);
    background: var(--accent);
    color: var(--accent-fg);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    line-height: var(--lh-tight);
  }

  .note-body {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
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
