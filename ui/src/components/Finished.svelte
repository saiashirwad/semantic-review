<script lang="ts">
  import { getReviewState } from "../state.svelte.ts";
  import Stamp from "./Stamp.svelte";

  const review = getReviewState();
  const exported = $derived(review.payload.mode === "export");
  const stampLabel = $derived(exported ? "REVIEW COPIED" : "REVIEW SENT");
</script>

<div class="finished">
  <div class="panel">
    <div class="hero">
      <Stamp label={stampLabel} color="var(--selected)" size="lg" />
    </div>
    <h2>{exported ? "Review copied" : "Review sent"}</h2>
    <p>
      {exported
        ? "Feedback is on your clipboard, ready to paste back to the agent."
        : "Feedback was delivered back to the agent. You can close this tab."}
    </p>
  </div>
</div>

<style>
  .finished {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 40px 20px;
  }

  .panel {
    max-width: 440px;
    padding: 40px 32px 36px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-pop);
    text-align: center;
    animation:
      finish-pop 0.28s cubic-bezier(0.2, 1.4, 0.4, 1),
      panel-shake 90ms linear 480ms;
  }

  @keyframes finish-pop {
    from {
      transform: scale(0.92) translateY(8px);
      opacity: 0;
    }
  }

  @keyframes panel-shake {
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

  .hero {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
    min-height: 72px;
  }

  h2 {
    margin: 0;
    font-size: var(--fs-xl);
    font-weight: 700;
  }

  p {
    margin-top: 8px;
    color: var(--fg-muted);
    font-size: var(--fs-md);
    line-height: 1.5;
  }

  @media (prefers-reduced-motion: reduce) {
    .panel {
      animation: none;
    }
  }
</style>
