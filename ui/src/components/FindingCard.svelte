<script lang="ts">
  import type { Finding } from "../../../src/analysis";
  import { getReviewState } from "../state.svelte";

  const { finding, key }: { finding: Finding; key: string } = $props();
  const review = getReviewState();

  const resolved = $derived(review.resolvedFindings.has(key));
  const sent = $derived(review.sentFindings.has(key));
</script>

<div class="card" class:muted={resolved || sent}>
  <button class="body" onclick={() => review.jumpToFinding(key)} title="Jump to code">
    <span class="sev sev-{finding.severity}" title={finding.severity}></span>
    <span class="text">
      <span class="title">{finding.title}</span>
      <span class="ref">{review.refForFinding(finding)}</span>
    </span>
  </button>
  {#if sent || resolved}
    <div class="status">
      <span class="state-tag">{sent ? "in review" : "resolved"}</span>
      <button class="undo" onclick={() => review.reopenFinding(key)}>Undo</button>
    </div>
  {/if}
</div>

<style>
  .card {
    padding: 10px 12px;
    border-bottom: var(--border-w) solid var(--border);
  }

  .card:last-child {
    border-bottom: 0;
  }

  .card:hover {
    background: var(--bg-hover);
  }

  .card.muted {
    opacity: 0.5;
  }

  .body {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    text-align: left;
  }

  .sev {
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    margin-top: 4px;
    border: 1px solid var(--border);
  }

  .sev-critical {
    background: var(--sev-critical);
  }
  .sev-major {
    background: var(--sev-major);
  }
  .sev-minor {
    background: var(--sev-minor);
  }
  .sev-info {
    background: var(--sev-info);
  }

  .text {
    display: block;
    min-width: 0;
  }

  .title {
    display: block;
    overflow: hidden;
    font-size: var(--fs-sm);
    font-weight: 600;
    line-height: 1.35;
  }

  .ref {
    display: block;
    margin-top: 2px;
    overflow: hidden;
    color: var(--fg-faint);
    font-family: var(--font-code);
    font-size: var(--fs-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 4px 0 0 18px;
  }

  .state-tag {
    padding: 1px 6px;
    border: 1px solid var(--border);
    background: var(--selected-soft);
    color: var(--selected-fg);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .undo {
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font-size: var(--fs-xs);
    font-weight: 700;
  }
</style>
