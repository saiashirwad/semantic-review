<script lang="ts">
  import { getReviewState } from "../state.svelte";
  import FindingCard from "./FindingCard.svelte";
  import CommentsList from "./CommentsList.svelte";
  import OverallBox from "./OverallBox.svelte";

  const review = getReviewState();

  let findingsOpen = $state(true);
</script>

<aside>
  {#if review.analysis.findings.length > 0}
    <div class="findings-box">
      <button class="findings-head" onclick={() => (findingsOpen = !findingsOpen)}>
        <span class="count-badge">{review.openFindingCount}</span>
        <span class="count-label">finding{review.openFindingCount === 1 ? "" : "s"}</span>
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
    top: 48px;
    height: calc(100vh - 48px);
    overflow-y: auto;
    padding: 20px 20px 20px 12px;
  }

  .findings-box {
    margin-bottom: 24px;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
  }

  .findings-head {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 38px;
    padding: 0 12px;
    border: 0;
    background: none;
  }

  .findings-head:hover {
    background: var(--bg-hover);
  }

  .count-badge {
    min-width: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: color-mix(in srgb, var(--sev-critical) 12%, transparent);
    color: var(--sev-critical);
    font-size: 11px;
    font-weight: 700;
    line-height: 18px;
    text-align: center;
  }

  .count-label {
    flex: 1;
    color: var(--fg);
    font-size: 13px;
    font-weight: 600;
    text-align: left;
  }

  .chevron {
    color: var(--fg-faint);
    font-size: 10px;
    transition: transform 0.12s;
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  .findings-list {
    border-top: 1px solid var(--border);
  }

  h3 {
    margin: 0 0 8px;
    color: var(--fg-faint);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h3:not(:first-child) {
    margin-top: 24px;
  }

  @media (max-width: 800px) {
    aside {
      position: static;
      height: auto;
      padding: 20px 14px;
      border-top: 1px solid var(--border);
    }
  }
</style>
