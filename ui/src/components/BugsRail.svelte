<script lang="ts">
  import { getReviewState } from "../state.svelte.ts";
  import FindingCard from "./FindingCard.svelte";
  import CommentsList from "./CommentsList.svelte";
  import OverallBox from "./OverallBox.svelte";

  const review = getReviewState();

  let findingsOpen = $state(true);
</script>

<aside
  class:drawer={review.narrow}
  class:open={review.reviewOpen}
  id="review-panel"
  aria-label="Review"
  aria-hidden={!review.reviewOpen ? "true" : undefined}
>
  <header class="rail-head">
    <span class="rail-label">Review</span>
    {#if review.openFindingCount > 0}
      <span class="count-badge head-badge">{review.openFindingCount}</span>
    {/if}
    <button
      type="button"
      class="tuck"
      title={review.narrow ? "Close (Esc)" : "Hide review panel"}
      aria-label={review.narrow ? "Close review" : "Hide review panel"}
      onclick={() => review.tuckReview()}
    >
      {review.narrow ? "✕" : "›"}
    </button>
  </header>

  {#if review.analysis.findings.length > 0}
    <div class="findings-box">
      <button class="findings-head" onclick={() => (findingsOpen = !findingsOpen)}>
        <span class="count-badge">{review.openFindingCount}</span>
        <span class="count-label">Findings</span>
        <span class="chevron" class:open={findingsOpen}>▸</span>
      </button>
      {#if findingsOpen}
        <div class="findings-list">
          {#each review.sortedFindings as { finding, key } (key)}
            <FindingCard {finding} {key} />
          {/each}
        </div>
      {/if}
    </div>
  {/if}
  <h3>Comments</h3>
  <CommentsList />
  <h3>Overall</h3>
  <OverallBox />
</aside>

<style>
  aside {
    position: sticky;
    top: var(--header-h);
    height: calc(100vh - var(--header-h));
    width: 100%;
    min-width: 0;
    overflow-x: visible;
    overflow-y: auto;
    /* Extra right/bottom padding so hard offset shadows aren't clipped */
    padding: var(--space-4) var(--space-4) var(--space-5) var(--space-2);
  }

  /* Wide tucked: leave the grid entirely */
  aside:not(.drawer):not(.open) {
    display: none;
  }

  /* Narrow: hard-edge right drawer */
  aside.drawer {
    position: fixed;
    top: var(--header-h);
    right: 0;
    bottom: 0;
    left: auto;
    z-index: 30;
    width: min(340px, calc(100vw - 48px));
    height: auto;
    padding: var(--space-3) var(--space-3) var(--space-5);
    background: var(--bg-raised);
    border-left: var(--border-w) solid var(--border);
    box-shadow: -8px 0 0 var(--border);
    transform: translateX(100%);
    visibility: hidden;
    pointer-events: none;
    transition:
      transform 0.12s linear,
      visibility 0.12s linear;
  }

  aside.drawer.open {
    transform: translateX(0);
    visibility: visible;
    pointer-events: auto;
  }

  @media (prefers-reduced-motion: reduce) {
    aside.drawer {
      transition: none;
    }
  }

  .rail-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 var(--space-3);
    padding: 0 2px;
  }

  .rail-label {
    flex: 1;
    color: var(--fg-faint);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .head-badge {
    flex-shrink: 0;
  }

  .tuck {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin: 0;
    padding: 0;
    border: 2px solid transparent;
    background: transparent;
    color: var(--fg-muted);
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
  }

  .tuck:hover {
    border-color: var(--border);
    background: var(--bg-hover);
    color: var(--fg);
  }

  .findings-box {
    width: 100%;
    margin-bottom: var(--space-5);
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
  }

  .findings-head {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 36px;
    padding: 0 12px;
    border: 0;
    background: var(--bg-panel);
  }

  .findings-head:hover {
    background: var(--bg-hover);
  }

  .count-badge {
    min-width: 20px;
    padding: 0 5px;
    border: var(--border-w) solid var(--border);
    background: var(--sev-critical);
    color: #fff;
    font-size: var(--fs-xs);
    font-weight: 700;
    line-height: 16px;
    text-align: center;
  }

  .count-label {
    flex: 1;
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-align: left;
  }

  .chevron {
    color: var(--fg-faint);
    font-size: var(--fs-sm);
    transition: transform 0.1s;
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  .findings-list {
    border-top: var(--border-w) solid var(--border);
  }

  h3 {
    margin: var(--space-4) 0 var(--space-2);
    color: var(--fg-faint);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    line-height: var(--lh-tight);
  }

  h3:first-of-type {
    margin-top: 0;
  }

  h3:not(:first-child) {
    margin-top: 20px;
  }
</style>
