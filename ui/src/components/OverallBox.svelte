<script lang="ts">
  import { getReviewState } from "../state.svelte.ts";

  const review = getReviewState();
</script>

<textarea bind:value={review.overall} placeholder="Optional overall feedback…"></textarea>

<style>
  textarea {
    display: block;
    width: 100%;
    min-height: 120px;
    flex: 1;
    padding: 10px;
    resize: vertical;
    border: 0;
    border-top: 0;
    background: var(--bg-raised);
    box-shadow: none;
    font-size: var(--fs-sm);
    line-height: 1.45;
    box-sizing: border-box;
  }

  textarea:focus {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  textarea::placeholder {
    color: var(--fg-faint);
  }
</style>
