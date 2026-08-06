<script lang="ts">
  const { text }: { text: string } = $props();

  const paragraphs = $derived(
    text
      .split(/\n\n+/)
      .filter((p) => p.trim())
      // Split each paragraph on `code` spans; odd indices are code.
      .map((p) => p.split(/`([^`]+)`/g)),
  );
</script>

{#each paragraphs as parts}
  <p>
    {#each parts as part, i}{#if i % 2 === 1}<code>{part}</code>{:else}{part}{/if}{/each}
  </p>
{/each}

<style>
  p {
    width: 100%;
    max-width: none;
    margin: 0 0 0.85em;
    line-height: var(--lh-prose);
    letter-spacing: -0.01em;
  }

  p:last-child {
    margin-bottom: 0;
  }
</style>
