<script lang="ts">
  import { getReviewState } from "../state.svelte";
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
      <label>
        <input
          type="checkbox"
          checked={review.includeNotes.has(review.activeResult)}
          onchange={(e) => toggle(e.currentTarget.checked)}
        />
        Include in review
      </label>
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
    margin-top: 40px;
    padding: 16px 18px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  h2 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
  }

  label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--fg-muted);
    font-size: 12px;
    cursor: pointer;
  }

  input {
    width: 13px;
    height: 13px;
    margin: 0;
    accent-color: var(--accent);
  }

  ul {
    margin: 8px 0 0;
    padding-left: 18px;
  }

  li {
    margin: 4px 0;
    color: var(--fg-muted);
    font-size: 13px;
  }
</style>
