<script lang="ts">
  import { getReviewState } from "../state.svelte.ts";

  const review = getReviewState();
</script>

<textarea bind:value={review.overall} placeholder="Optional overall feedback…"></textarea>

<style>
  textarea {
    display: block;
    width: 100%;
    min-height: 88px;
    padding: 10px 12px;
    resize: vertical;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
    font-size: var(--fs-sm);
    line-height: 1.45;
    box-sizing: border-box;
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }

  textarea::placeholder {
    color: var(--fg-faint);
  }
</style>
