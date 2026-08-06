<script lang="ts">
  import { getReviewState } from "../state.svelte.ts";

  const review = getReviewState();
</script>

<textarea bind:value={review.overall} placeholder="Optional overall feedback…"></textarea>

<style>
  textarea {
    display: block;
    width: 100%;
    min-height: 96px;
    max-height: 45vh;
    padding: 10px;
    resize: vertical;
    border: 0;
    background: var(--bg-raised);
    box-shadow: none;
    font-size: var(--fs-sm);
    line-height: 1.45;
    box-sizing: border-box;
  }

  textarea:focus {
    outline: none;
    box-shadow: inset 3px 0 0 var(--accent);
  }

  textarea::placeholder {
    color: var(--fg-faint);
  }
</style>
