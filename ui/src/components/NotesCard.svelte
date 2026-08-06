<script lang="ts">
  import { getReviewState } from "../state.svelte";
  import Check from "./Check.svelte";
  import Prose from "./Prose.svelte";

  const review = getReviewState();

  function toggle(checked: boolean) {
    if (checked) review.includeNotes.add(review.activeResult);
    else review.includeNotes.delete(review.activeResult);
  }
</script>

{#if review.analysis.notes.length > 0}
  <section class="notes" data-ctx="Agent's notes">
    <div class="head">
      <h2>Agent&#8217;s notes</h2>
      <Check
        checked={review.includeNotes.has(review.activeResult)}
        label="Include in review"
        onchange={toggle}
      />
    </div>
    <ul>
      {#each review.analysis.notes as note}
        <li><Prose text={note} /></li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .notes {
    margin-top: 32px;
    padding: 14px 16px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  h2 {
    margin: 0;
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--fg-muted);
  }

  ul {
    margin: 10px 0 0;
    padding-left: 18px;
  }

  li {
    margin: 4px 0;
    color: var(--fg-muted);
    font-size: var(--fs-sm);
  }
</style>
