/** Pure placement helpers for the finding popover. */

export const POPOVER_GAP = 10;
export const POPOVER_EDGE = 8;
export const POPOVER_WIDTH = 400;
export const POPOVER_MIN_CARD = 140;

export type PlaceRect = { left: number; top: number; bottom: number; right: number; width: number; height: number };

export function headerOffsetPx(getProp: (name: string) => string = (n) =>
  typeof document !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue(n).trim() : "",
): number {
  const n = parseFloat(getProp("--header-h"));
  return Number.isFinite(n) ? n : 48;
}

export function pickVisibleAnchor(anchors: Iterable<HTMLElement>, viewportH: number): HTMLElement | null {
  const list = [...anchors];
  if (list.length === 0) return null;
  for (const a of list) {
    const r = a.getBoundingClientRect();
    if (r.bottom > 0 && r.top < viewportH) return a;
  }
  return list[0];
}

export function rowVisible(rowRect: PlaceRect, headerH: number, viewportH: number, edge = POPOVER_EDGE): boolean {
  const top = headerH + edge;
  const bottom = viewportH - edge;
  return rowRect.bottom > top + 12 && rowRect.top < bottom - 12;
}

export function computePopoverPos(opts: {
  rowRect: PlaceRect;
  contentHeight: number;
  viewportW: number;
  viewportH: number;
  headerH: number;
  preferredWidth?: number;
  gap?: number;
  edge?: number;
  minCard?: number;
}): { left: number; top: number; maxHeight: number; width: number } {
  const {
    rowRect,
    contentHeight,
    viewportW,
    viewportH,
    headerH,
    preferredWidth = POPOVER_WIDTH,
    gap = POPOVER_GAP,
    edge = POPOVER_EDGE,
    minCard = POPOVER_MIN_CARD,
  } = opts;

  const width = Math.min(preferredWidth, viewportW - edge * 2);
  const topBound = headerH + edge;
  const botBound = viewportH - edge;

  const spaceBelow = botBound - rowRect.bottom - gap;
  const spaceAbove = rowRect.top - topBound - gap;
  const openBelow = spaceBelow >= minCard || spaceBelow >= spaceAbove;

  const maxHeight = Math.min(openBelow ? Math.max(spaceBelow, 120) : Math.max(spaceAbove, 120), botBound - topBound);

  const height = Math.min(contentHeight, maxHeight) || minCard;

  let top: number;
  if (openBelow) {
    top = rowRect.bottom + gap;
    if (top + height > botBound) top = Math.max(topBound, botBound - height);
  } else {
    top = rowRect.top - gap - height;
    if (top < topBound) top = topBound;
  }

  const left = Math.max(edge, Math.min(rowRect.left, viewportW - width - edge));
  return { left, top, maxHeight, width };
}
