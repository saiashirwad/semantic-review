<script lang="ts">
  /** Highlighted (or plain) code excerpt shared by comments, composer, findings. */
  interface Props {
    html?: string;
    quote?: string;
    /** CSS max-height for the scrollable body. */
    maxHeight?: string;
  }

  const { html, quote = "", maxHeight = "96px" }: Props = $props();
  const lines = $derived(html ? html.split("\n") : []);
</script>

{#if html || quote}
  <div class="quote-frame" style:--quote-max={maxHeight}>
    <div class="quote-bar" aria-hidden="true"></div>
    {#if html}
      <blockquote class="quote">
        {#each lines as lineHtml}
          <span class="qline">{@html lineHtml || "&nbsp;"}</span>
        {/each}
      </blockquote>
    {:else}
      <blockquote class="quote plain">{quote}</blockquote>
    {/if}
  </div>
{/if}

<style>
  .quote-frame {
    display: flex;
    overflow: hidden;
    border: var(--border-w) solid var(--border);
    background: var(--bg-code);
    box-shadow: 2px 2px 0 var(--border);
  }

  .quote-bar {
    flex-shrink: 0;
    width: 3px;
    background: var(--accent);
  }

  .quote {
    flex: 1;
    min-width: 0;
    margin: 0;
    padding: 8px 10px;
    overflow: auto;
    max-height: var(--quote-max, 96px);
    border: 0;
    background: transparent;
    color: var(--fg-code);
    font-family: var(--font-code);
    font-size: 11px;
    line-height: 1.5;
    white-space: pre;
    word-break: normal;
    overflow-wrap: normal;
  }

  .quote :global(span[style]) {
    background: transparent !important;
  }

  .qline {
    display: block;
    min-height: 1.5em;
    white-space: pre;
  }

  .quote.plain {
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
