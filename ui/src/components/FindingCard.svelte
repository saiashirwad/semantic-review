<script lang="ts">
  import type { Finding } from "../../../src/analysis.ts";
  import { getReviewState } from "../state.svelte.ts";
  import Stamp from "./Stamp.svelte";

  const { finding, key }: { finding: Finding; key: string } = $props();
  const review = getReviewState();

  const disposition = $derived(review.findingDisposition(key));
  const stampLabel = $derived(disposition === "sent" ? "SENT →" : "RESOLVED");
  const stampColor = $derived(disposition === "sent" ? "var(--accent)" : "var(--selected)");
</script>

<div class="card sev-{finding.severity}" class:muted={disposition != null} class:hatched={disposition != null}>
  <button class="body" onclick={() => review.jumpToFinding(key)} title="Jump to code">
    <span class="sev sev-{finding.severity}" title={finding.severity}></span>
    <span class="text">
      <span class="title">{finding.title}</span>
      <span class="ref">{review.refForFinding(finding)}</span>
    </span>
  </button>
  {#if disposition}
    {#key disposition}
      <div class="stamp-layer" class:shake={true}>
        <Stamp label={stampLabel} color={stampColor} />
      </div>
    {/key}
    <div class="status">
      <button class="undo" onclick={() => review.reopenFinding(key)}>Undo</button>
    </div>
  {/if}
</div>

<style>
  .card {
    position: relative;
    padding: 10px 12px;
    border-bottom: var(--border-w) solid var(--border);
  }

  /* Severity edge — rail scans by color without reading the dots */
  .card.sev-critical {
    box-shadow: inset 3px 0 0 var(--sev-critical);
  }
  .card.sev-major {
    box-shadow: inset 3px 0 0 var(--sev-major);
  }
  .card.sev-minor {
    box-shadow: inset 3px 0 0 var(--sev-minor);
  }
  .card.sev-info {
    box-shadow: inset 3px 0 0 var(--sev-info);
  }

  .card:last-child {
    border-bottom: 0;
  }

  .card:hover {
    background: var(--bg-hover);
  }

  .card.hatched {
    background: repeating-linear-gradient(
      45deg,
      transparent 0 6px,
      color-mix(in srgb, var(--fg) 7%, transparent) 6px 8px
    );
  }

  .card.hatched:hover {
    background:
      repeating-linear-gradient(
        45deg,
        transparent 0 6px,
        color-mix(in srgb, var(--fg) 7%, transparent) 6px 8px
      ),
      var(--bg-hover);
  }

  .card.muted {
    opacity: 0.85;
  }

  .stamp-layer {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 1;
  }

  .stamp-layer.shake {
    animation: stamp-shake 90ms linear;
  }

  @keyframes stamp-shake {
    0% {
      transform: translate(0);
    }
    40% {
      transform: translate(2px, 1px);
    }
    100% {
      transform: translate(0);
    }
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

  .body:active {
    transform: translate(1px, 1px);
  }

  .sev {
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    margin-top: 4px;
    border: 1px solid var(--border);
  }

  .sev.sev-critical {
    background: var(--sev-critical);
  }
  .sev.sev-major {
    background: var(--sev-major);
  }
  .sev.sev-minor {
    background: var(--sev-minor);
  }
  .sev.sev-info {
    background: var(--sev-info);
  }

  .text {
    display: block;
    min-width: 0;
  }

  .title {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
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
    position: relative;
    z-index: 2;
  }

  .undo {
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font-size: var(--fs-xs);
    font-weight: 700;
  }

  .undo:active {
    transform: translate(1px, 1px);
  }

  @media (prefers-reduced-motion: reduce) {
    .stamp-layer.shake {
      animation: none;
    }
    .body:active,
    .undo:active {
      transform: none;
    }
  }
</style>
