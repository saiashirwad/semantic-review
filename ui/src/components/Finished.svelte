<script lang="ts">
  import { getReviewState } from "../state.svelte";

  const review = getReviewState();
  const exported = $derived(review.payload.mode === "export");
</script>

<div class="finished">
  <div class="check">✓</div>
  <h2>{exported ? "Review copied" : "Review sent"}</h2>
  <p>
    {exported
      ? "Feedback is on your clipboard, ready to paste back to the agent."
      : "Feedback was delivered back to the agent. You can close this tab."}
  </p>
</div>

<style>
  .finished {
    padding: 120px 20px;
    text-align: center;
  }

  .check {
    width: 40px;
    height: 40px;
    margin: 0 auto 16px;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 18px;
    font-weight: 700;
    line-height: 40px;
  }

  h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  p {
    margin-top: 6px;
    color: var(--fg-muted);
    font-size: 13.5px;
  }
</style>
