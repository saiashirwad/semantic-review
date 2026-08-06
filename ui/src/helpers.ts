/**
 * Pure UI helpers — unit-tested without mounting Svelte.
 * Keep free of DOM / browser APIs except where noted.
 */

import type { PayloadFile } from "../../src/payload.ts";

/** Digit list for odometer slots (no locale separators). */
export function odometerDigits(value: number): number[] {
  const n = Math.max(0, Math.floor(Math.abs(value)));
  return String(n).split("").map((d) => Number(d));
}

/** Count add/del lines across payload files (kind strings from payload). */
export function countAddDel(files: PayloadFile[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const file of files) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.kind === "add") added++;
        else if (line.kind === "del") removed++;
      }
    }
  }
  return { added, removed };
}

/** Flat ordered hunk ids: files in order, hunks in order. */
export function orderedHunkIds(files: PayloadFile[]): string[] {
  const ids: string[] = [];
  for (const file of files) {
    for (const hunk of file.hunks) ids.push(hunk.id);
  }
  return ids;
}

export type MarginNoteInput = { id: string; y: number; height: number };

/**
 * Sort notes by y and push each below the previous so cards never overlap.
 * Returns top positions (document-relative to main) for each note id.
 */
export function packMarginNotes(
  notes: MarginNoteInput[],
  minGap = 8,
): Map<string, number> {
  const sorted = [...notes].sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
  const tops = new Map<string, number>();
  let prevBottom = -Infinity;
  for (const n of sorted) {
    const top = Math.max(n.y, prevBottom + minGap);
    tops.set(n.id, top);
    prevBottom = top + n.height;
  }
  return tops;
}

export type ThemeChoice = "light" | "dark";

export const THEME_STORAGE_KEY = "semantic-review:theme";

/** Parse stored theme; invalid / missing → null (follow OS). */
export function parseStoredTheme(raw: string | null | undefined): ThemeChoice | null {
  if (raw === "light" || raw === "dark") return raw;
  return null;
}

/** Apply theme to documentElement; empty/null clears dataset (OS follow). */
export function applyThemeDataset(
  el: { dataset: DOMStringMap },
  theme: ThemeChoice | null,
): void {
  if (theme === "light" || theme === "dark") el.dataset.theme = theme;
  else delete el.dataset.theme;
}

export function readThemeFromStorage(
  getItem: (key: string) => string | null,
): ThemeChoice | null {
  try {
    return parseStoredTheme(getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeThemeToStorage(
  setItem: (key: string, value: string) => void,
  removeItem: (key: string) => void,
  theme: ThemeChoice | null,
): void {
  try {
    if (theme === "light" || theme === "dark") setItem(THEME_STORAGE_KEY, theme);
    else removeItem(THEME_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

/** Next/prev index in a circular list; empty → -1. */
export function cycleIndex(current: number, length: number, delta: 1 | -1): number {
  if (length <= 0) return -1;
  if (current < 0 || current >= length) return delta === 1 ? 0 : length - 1;
  return (current + delta + length) % length;
}

/** Open findings in severity-sorted order (keys only). */
export function openFindingKeys(
  entries: { key: string }[],
  isOpen: (key: string) => boolean,
): string[] {
  return entries.filter((e) => isOpen(e.key)).map((e) => e.key);
}
