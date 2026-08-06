<script lang="ts">
  // Pre-rendered SVG from the server; falls back to showing the mermaid
  // source when rendering failed server-side.
  const { svg, source }: { svg: string; source: string } = $props();
</script>

{#if svg}
  <div class="diagram">{@html svg}</div>
{:else if source.trim()}
  <pre class="diagram source">{source}</pre>
{/if}

<style>
  .diagram {
    display: flex;
    justify-content: center;
    margin: 14px 0;
    padding: 18px;
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
  }

  .diagram :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: auto;
  }

  pre.source {
    display: block;
    font: var(--font-mono);
  }
</style>
