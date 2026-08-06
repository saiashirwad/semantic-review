<script lang="ts">
  import { getReviewState } from "../state.svelte";

  const review = getReviewState();
</script>

<textarea bind:value={review.overall} placeholder="Optional overall feedback…"></textarea>

<style>
  textarea {
    width: 100%;
    min-height: 70px;
    padding: 8px 10px;
    resize: vertical;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-raised);
    font-size: 13px;
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  textarea::placeholder {
    color: var(--fg-faint);
  }
</style>
