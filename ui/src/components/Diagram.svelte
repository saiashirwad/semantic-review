<script lang="ts">
  const { svg, source }: { svg: string; source: string } = $props();
</script>

{#if svg}
  <div class="diagram">{@html svg}</div>
{:else if source.trim()}
  <pre class="diagram source">{source}</pre>
{/if}

<style>
  /*
   * Diagram field is quieter than page chrome: light surface, soft edges.
   * Outer card keeps the hard neobrutal border; interior shouldn't shout.
   * Nodes stay readable (near-black type); arrows keep accent orange.
   */
  .diagram {
    --d-bg: #faf8f4;
    --d-fg: var(--fg);
    /* Edges / lifelines — graphite, not pure black (less clash) */
    --d-line: #9a948a;
    --d-accent: var(--accent);
    --d-muted: var(--fg-faint);
    --d-surface: #ffffff;
    /* Node outlines slightly softer than page --border */
    --d-border: #2a2a2a;

    display: flex;
    justify-content: center;
    margin: 14px 0;
    padding: 22px 20px;
    overflow: auto;
    border: var(--border-w) solid var(--border);
    background: #faf8f4;
    box-shadow: var(--shadow-card);
  }

  /* Dark mode: lift the field, keep edges muted against black chrome */
  @media (prefers-color-scheme: dark) {
    .diagram {
      --d-bg: #141414;
      --d-line: #6a6a6a;
      --d-border: #c8c8c8;
      --d-surface: #1c1c1c;
      background: #141414;
    }
  }

  .diagram :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: auto;
  }

  .diagram :global(text) {
    font-family: var(--font-ui) !important;
    font-weight: 600;
    fill: var(--fg) !important;
  }

  .diagram :global(.node) :global(text) {
    font-size: 13px;
  }

  /* Sequence: alt/loop frames use group fills — keep them barely-there */
  .diagram :global(.subgraph) > :global(rect:first-child) {
    fill: color-mix(in srgb, var(--d-bg) 70%, #ffffff);
  }

  .diagram :global(.subgraph) > :global(rect:nth-child(2)) {
    fill: #ffffff;
  }

  .diagram :global(.subgraph) > :global(text) {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    fill: var(--fg-faint) !important;
  }

  .diagram :global(.node) > :global(rect),
  .diagram :global(.node) > :global(polygon),
  .diagram :global(.node) > :global(circle),
  .diagram :global(.node) > :global(ellipse) {
    fill: var(--d-surface);
  }

  pre.source {
    display: block;
    margin: 0;
    font-family: var(--font-code);
    font-size: var(--fs-sm);
    font-weight: 500;
    color: var(--fg-muted);
    white-space: pre-wrap;
  }
</style>
