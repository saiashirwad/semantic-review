<script lang="ts">
  /** Plain code excerpt shared by comments, composer, findings. */
  interface Props {
    quote?: string;
    /** CSS max-height for the body. */
    maxHeight?: string;
    /**
     * `clip` (default): wrap long lines, no scrollbars — for list cards.
     * `scroll`: allow overflow inside a capped box — for floating composer.
     */
    overflow?: "clip" | "scroll";
  }

  const { quote = "", maxHeight = "96px", overflow = "clip" }: Props = $props();
</script>

{#if quote}
  <div class="quote-frame" class:scroll={overflow === "scroll"} style:--quote-max={maxHeight}>
    <div class="quote-bar" aria-hidden="true"></div>
    <blockquote class="quote plain">{quote}</blockquote>
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
    border: 0;
    background: transparent;
    color: var(--fg-code);
    font-family: var(--font-code);
    font-size: 11px;
    line-height: 1.5;
  }

  .quote-frame:not(.scroll) .quote.plain {
    overflow: hidden;
    max-height: var(--quote-max, 96px);
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .quote-frame.scroll .quote.plain {
    overflow: auto;
    max-height: var(--quote-max, 96px);
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
