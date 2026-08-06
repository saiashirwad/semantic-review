<script lang="ts">
  import { odometerDigits } from "../helpers.ts";

  const { value }: { value: number } = $props();
  const digits = $derived(odometerDigits(value));
</script>

<span class="odometer" aria-label={String(Math.max(0, Math.floor(Math.abs(value))))}>
  {#each digits as digit, i (i)}
    <span class="slot">
      <span class="col" style:transform="translateY(calc(-1em * {digit}))">
        {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as d}
          <span class="digit">{d}</span>
        {/each}
      </span>
    </span>
  {/each}
</span>

<style>
  .odometer {
    display: inline-flex;
    font-family: var(--font-code);
    font-variant-numeric: tabular-nums;
    line-height: 1em;
  }

  .slot {
    display: inline-flex;
    overflow: hidden;
    height: 1em;
    line-height: 1em;
  }

  .col {
    display: flex;
    flex-direction: column;
    transition: transform 160ms cubic-bezier(0.3, 0.9, 0.3, 1);
  }

  .digit {
    display: block;
    height: 1em;
    line-height: 1em;
  }

  @media (prefers-reduced-motion: reduce) {
    .col {
      transition: none;
    }
  }
</style>
