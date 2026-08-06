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
   * Diagram in a hard card — same language as summary / notes.
   * Soft graphite edges inside; white nodes for contrast.
   */
  .diagram {
    --d-bg: var(--diagram-bg);
    --d-fg: var(--fg);
    --d-line: var(--diagram-line);
    --d-accent: var(--accent);
    --d-muted: var(--fg-faint);
    --d-surface: var(--bg-raised);
    --d-border: var(--diagram-border);

    display: flex;
    justify-content: center;
    margin: var(--space-4) 0 var(--space-5);
    padding: var(--space-5) var(--space-4);
    overflow: auto;
    border: var(--border-w) solid var(--border);
    background: var(--diagram-bg);
    box-shadow: var(--shadow-card);
  }

  @media (prefers-color-scheme: dark) {
    .diagram {
      --d-bg: var(--bg-raised);
      --d-line: #6a6a6a;
      --d-border: #c8c8c8;
      --d-surface: #1c1c1c;
      background: var(--bg-raised);
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
