/** Shared drag helper for fixed/absolute popovers. */

export type Point = { left: number; top: number };

const EDGE = 8;

/**
 * Begin a pointer drag on a handle. `current` is the popover's CSS left/top
 * (document coords for position:absolute, viewport for position:fixed).
 */
export function startPopoverDrag(
  e: PointerEvent,
  current: Point,
  onMove: (p: Point) => void,
  opts: { mode: "fixed" | "absolute"; width: number; height: number },
) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();

  const handle = e.currentTarget as HTMLElement;
  const startX = e.clientX;
  const startY = e.clientY;
  const origL = current.left;
  const origT = current.top;

  handle.setPointerCapture(e.pointerId);
  handle.classList.add("dragging");

  const move = (ev: PointerEvent) => {
    let left = origL + (ev.clientX - startX);
    let top = origT + (ev.clientY - startY);
    const { width: w, height: h, mode } = opts;

    if (mode === "fixed") {
      left = Math.max(EDGE, Math.min(left, window.innerWidth - w - EDGE));
      top = Math.max(EDGE, Math.min(top, window.innerHeight - h - EDGE));
    } else {
      left = Math.max(window.scrollX + EDGE, Math.min(left, window.scrollX + window.innerWidth - w - EDGE));
      top = Math.max(window.scrollY + EDGE, Math.min(top, window.scrollY + window.innerHeight - h - EDGE));
    }
    onMove({ left, top });
  };

  const up = (ev: PointerEvent) => {
    handle.releasePointerCapture(ev.pointerId);
    handle.classList.remove("dragging");
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", up);
    handle.removeEventListener("pointercancel", up);
  };

  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", up);
  handle.addEventListener("pointercancel", up);
}
