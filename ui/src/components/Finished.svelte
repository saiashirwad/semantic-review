<script lang="ts">
  import { getReviewState } from "../state.svelte.ts";

  const review = getReviewState();
  const exported = $derived(review.payload.mode === "export");
</script>

<div class="finished">
  <div class="panel">
    <div class="check">✓</div>
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
    max-width: 400px;
    padding: 36px 32px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
    text-align: center;
  }

  .check {
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
    border: var(--border-w) solid var(--border);
    background: var(--selected);
    color: #fff;
    font-size: 22px;
    font-weight: 700;
    line-height: 44px;
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
</style>
