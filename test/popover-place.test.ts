import { describe, expect, test } from "bun:test";
import {
  computePopoverPos,
  headerOffsetPx,
  rowVisible,
  POPOVER_EDGE,
  POPOVER_MIN_CARD,
} from "../ui/src/popover-place";

describe("popover-place", () => {
  test("headerOffsetPx falls back when --header-h is missing", () => {
    expect(headerOffsetPx(() => "")).toBe(48);
    expect(headerOffsetPx(() => "52px")).toBe(52);
  });

  test("rowVisible respects sticky header band", () => {
    const row = { left: 0, top: 100, bottom: 120, right: 400, width: 400, height: 20 };
    expect(rowVisible(row, 48, 800)).toBe(true);
    // Fully above the header band
    expect(rowVisible({ ...row, top: 0, bottom: 40 }, 48, 800)).toBe(false);
    // Fully below the viewport
    expect(rowVisible({ ...row, top: 900, bottom: 920 }, 48, 800)).toBe(false);
  });

  test("computePopoverPos prefers below when space allows", () => {
    const placed = computePopoverPos({
      rowRect: { left: 40, top: 100, bottom: 120, right: 440, width: 400, height: 20 },
      contentHeight: 200,
      viewportW: 1000,
      viewportH: 800,
      headerH: 48,
    });
    expect(placed.top).toBe(120 + 10); // row bottom + gap
    expect(placed.left).toBe(40);
    expect(placed.width).toBeLessThanOrEqual(400);
    expect(placed.maxHeight).toBeGreaterThanOrEqual(POPOVER_MIN_CARD);
  });

  test("computePopoverPos flips above when below is tight", () => {
    const rowTop = 700;
    const contentHeight = 280;
    const placed = computePopoverPos({
      rowRect: { left: 40, top: rowTop, bottom: 720, right: 440, width: 400, height: 20 },
      contentHeight,
      viewportW: 1000,
      viewportH: 800,
      headerH: 48,
    });
    // Open above the row; the measured content height fits under the row top
    expect(placed.top).toBeLessThan(rowTop);
    expect(placed.top + contentHeight).toBeLessThanOrEqual(rowTop);
    expect(placed.top).toBeGreaterThanOrEqual(48 + POPOVER_EDGE);
  });

  test("computePopoverPos clamps left edge", () => {
    const placed = computePopoverPos({
      rowRect: { left: -50, top: 100, bottom: 120, right: 350, width: 400, height: 20 },
      contentHeight: 160,
      viewportW: 500,
      viewportH: 800,
      headerH: 48,
    });
    expect(placed.left).toBe(POPOVER_EDGE);
  });
});
