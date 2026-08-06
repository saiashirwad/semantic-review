<script lang="ts">
  /** Drag handle for absolute/fixed popovers (composer, finding card). */
  interface Props {
    onpointerdown: (e: PointerEvent) => void;
  }

  const { onpointerdown }: Props = $props();
</script>

<button
  type="button"
  class="grip"
  title="Drag to move"
  aria-label="Drag to move"
  {onpointerdown}
>
  <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
    <circle cx="3" cy="2" r="1.4" fill="currentColor" />
    <circle cx="9" cy="2" r="1.4" fill="currentColor" />
    <circle cx="3" cy="7" r="1.4" fill="currentColor" />
    <circle cx="9" cy="7" r="1.4" fill="currentColor" />
    <circle cx="3" cy="12" r="1.4" fill="currentColor" />
    <circle cx="9" cy="12" r="1.4" fill="currentColor" />
  </svg>
</button>

<style>
  .grip {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin: 0;
    padding: 0;
    border: 2px solid transparent;
    background: transparent;
    color: var(--fg-faint);
    cursor: grab;
    touch-action: none;
  }

  .grip:hover {
    border-color: var(--border);
    background: var(--bg-hover);
    color: var(--fg);
  }

  .grip:global(.dragging),
  .grip:active {
    cursor: grabbing;
    border-color: var(--border);
    background: var(--bg-hover);
    color: var(--fg);
  }
</style>
