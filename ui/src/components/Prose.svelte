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
    margin: 6px 0;
    /* Extra leading so inline code chips + hard shadows don't collide on wrap */
    line-height: 1.75;
  }

  p:first-child {
    margin-top: 0;
  }

  p:last-child {
    margin-bottom: 0;
  }
</style>
