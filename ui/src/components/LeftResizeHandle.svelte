<script lang="ts">
  /** Drag handle on the left rail's right edge (wide layout only). */
  import { getReviewState } from "../state.svelte.ts";

  const review = getReviewState();
  let dragging = $state(false);

  function onPointerDown(e: PointerEvent) {
    if (review.narrow || e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const startX = e.clientX;
    const startW = review.leftWidth;
    el.setPointerCapture(e.pointerId);
    dragging = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      review.setLeftWidth(startW + (ev.clientX - startX));
    };
    const onUp = (ev: PointerEvent) => {
      dragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        el.releasePointerCapture(ev.pointerId);
      } catch {
        /* already released */
      }
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  }
</script>

{#if !review.narrow}
  <button
    type="button"
    class="resize-handle"
    class:dragging
    aria-label="Resize side panel ({review.leftWidth}px)"
    title="Drag to resize"
    onpointerdown={onPointerDown}
    onkeydown={(e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        review.setLeftWidth(review.leftWidth - 16);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        review.setLeftWidth(review.leftWidth + 16);
      }
    }}
  ></button>
{/if}

<style>
  .resize-handle {
    position: absolute;
    top: 0;
    right: -3px;
    z-index: 6;
    width: 7px;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: col-resize;
    touch-action: none;
  }

  .resize-handle::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 2px;
    width: 2px;
    background: transparent;
  }

  .resize-handle:hover::after,
  .resize-handle:focus-visible::after,
  .resize-handle.dragging::after {
    background: var(--accent);
  }

  .resize-handle:focus-visible {
    outline: none;
  }
</style>
