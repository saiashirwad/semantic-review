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
   * Diagram color aliases — non-colliding names so beautiful-mermaid can set
   * --bg/--fg/--accent on the SVG without circular var() references.
   * Values track the neobrutal design tokens (and dark mode).
   */
  .diagram {
    --d-bg: var(--bg-raised);
    --d-fg: var(--fg);
    --d-line: var(--border);
    --d-accent: var(--accent);
    --d-muted: var(--fg-faint);
    --d-surface: var(--bg-panel);
    --d-border: var(--border);

    display: flex;
    justify-content: center;
    margin: 14px 0;
    padding: 20px 18px;
    overflow: auto;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
  }

  .diagram :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: auto;
  }

  /* Labels: UI sans, slightly heavy — matches walkthrough chrome */
  .diagram :global(text) {
    font-family: var(--font-ui) !important;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  /* Node labels stay mono-ish weight; identifiers read cleaner heavy */
  .diagram :global(.node) :global(text) {
    font-family: var(--font-code) !important;
    font-weight: 600;
    font-size: 12.5px;
  }

  /* Group headers: kicker-style uppercase chrome */
  .diagram :global(.subgraph) > :global(text) {
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* Cream header band on white group body */
  .diagram :global(.subgraph) > :global(rect:nth-child(2)) {
    fill: var(--bg-panel);
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
