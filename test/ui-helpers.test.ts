/**
 * Unit tests for pure UI helpers (real modules — no re-implementation).
 */
import { describe, expect, test } from "bun:test";
import {
  applyThemeDataset,
  countAddDel,
  cycleIndex,
  odometerDigits,
  openFindingKeys,
  orderedHunkIds,
  packMarginNotes,
  parseStoredTheme,
  readThemeFromStorage,
  writeThemeToStorage,
  THEME_STORAGE_KEY,
} from "../ui/src/helpers.ts";
import type { PayloadFile } from "../src/payload.ts";

function file(path: string, hunks: PayloadFile["hunks"]): PayloadFile {
  return {
    path,
    oldPath: path,
    status: "modified",
    adds: 0,
    dels: 0,
    hunks,
  };
}

function hunk(id: string, lines: { kind: "add" | "del" | "context"; text: string }[]) {
  return {
    id,
    header: `@@ ${id} @@`,
    lines: lines.map((l, i) => ({
      kind: l.kind,
      text: l.text,
      oldNo: l.kind === "add" ? null : i + 1,
      newNo: l.kind === "del" ? null : i + 1,
    })),
  };
}

describe("odometerDigits", () => {
  test("renders absolute integer digits without separators", () => {
    expect(odometerDigits(0)).toEqual([0]);
    expect(odometerDigits(42)).toEqual([4, 2]);
    expect(odometerDigits(1000)).toEqual([1, 0, 0, 0]);
    expect(odometerDigits(99.9)).toEqual([9, 9]);
    expect(odometerDigits(-3)).toEqual([3]);
  });
});

describe("countAddDel", () => {
  test("counts add/del kinds across files", () => {
    const files = [
      file("a.ts", [
        hunk("h1", [
          { kind: "add", text: "x" },
          { kind: "add", text: "y" },
          { kind: "del", text: "z" },
          { kind: "context", text: "c" },
        ]),
      ]),
      file("b.ts", [hunk("h2", [{ kind: "del", text: "d" }])]),
    ];
    expect(countAddDel(files)).toEqual({ added: 2, removed: 2 });
  });

  test("empty files yield zeros", () => {
    expect(countAddDel([])).toEqual({ added: 0, removed: 0 });
  });
});

describe("orderedHunkIds", () => {
  test("files then hunks in order", () => {
    const files = [
      file("a.ts", [hunk("h1", []), hunk("h2", [])]),
      file("b.ts", [hunk("h3", [])]),
    ];
    expect(orderedHunkIds(files)).toEqual(["h1", "h2", "h3"]);
  });
});

describe("packMarginNotes", () => {
  test("pushes overlapping notes below previous with minGap", () => {
    const tops = packMarginNotes(
      [
        { id: "a", y: 100, height: 40 },
        { id: "b", y: 110, height: 40 },
        { id: "c", y: 300, height: 40 },
      ],
      8,
    );
    expect(tops.get("a")).toBe(100);
    // 100 + 40 + 8 = 148 > 110
    expect(tops.get("b")).toBe(148);
    expect(tops.get("c")).toBe(300);
  });

  test("sorts by y before packing", () => {
    const tops = packMarginNotes(
      [
        { id: "late", y: 50, height: 20 },
        { id: "early", y: 10, height: 20 },
      ],
      8,
    );
    expect(tops.get("early")).toBe(10);
    // 10 + 20 + 8 = 38; late y=50 does not collide
    expect(tops.get("late")).toBe(50);
  });
});

describe("theme storage", () => {
  test("parseStoredTheme accepts only light/dark", () => {
    expect(parseStoredTheme("light")).toBe("light");
    expect(parseStoredTheme("dark")).toBe("dark");
    expect(parseStoredTheme(null)).toBe(null);
    expect(parseStoredTheme("auto")).toBe(null);
    expect(parseStoredTheme("")).toBe(null);
  });

  test("read/write guards and round-trip", () => {
    const store = new Map<string, string>();
    writeThemeToStorage(
      (k, v) => store.set(k, v),
      (k) => store.delete(k),
      "dark",
    );
    expect(store.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(readThemeFromStorage((k) => store.get(k) ?? null)).toBe("dark");
    writeThemeToStorage(
      (k, v) => store.set(k, v),
      (k) => store.delete(k),
      null,
    );
    expect(store.has(THEME_STORAGE_KEY)).toBe(false);
  });

  test("applyThemeDataset sets and clears", () => {
    const el = { dataset: {} as DOMStringMap };
    applyThemeDataset(el, "light");
    expect(el.dataset.theme).toBe("light");
    applyThemeDataset(el, null);
    expect(el.dataset.theme).toBeUndefined();
  });
});

describe("keyboard helpers", () => {
  test("cycleIndex wraps", () => {
    expect(cycleIndex(0, 3, 1)).toBe(1);
    expect(cycleIndex(2, 3, 1)).toBe(0);
    expect(cycleIndex(0, 3, -1)).toBe(2);
    expect(cycleIndex(-1, 3, 1)).toBe(0);
    expect(cycleIndex(0, 0, 1)).toBe(-1);
  });

  test("openFindingKeys filters open", () => {
    const keys = openFindingKeys(
      [{ key: "a" }, { key: "b" }, { key: "c" }],
      (k) => k !== "b",
    );
    expect(keys).toEqual(["a", "c"]);
  });
});
