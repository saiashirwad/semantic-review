import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Guards the packaged artifact: the built bundle must be loadable and carry
// no remote URLs (exported reports must work fully offline). Skipped when
// the UI has not been built (`bun run build:ui`).
const appPath = join(import.meta.dir, "../dist/ui/app.js");
const cssPath = join(import.meta.dir, "../dist/ui/style.css");
const built = existsSync(appPath) && existsSync(cssPath);

describe.skipIf(!built)("built UI bundle", () => {
  test("contains no remote asset URLs", () => {
    const js = readFileSync(appPath, "utf8");
    // Svelte error-docs links and xmlns constants are string literals, not
    // fetched assets; anything else pointing at http(s) is a regression.
    const urls = [...js.matchAll(/https?:\/\/[^\s"'`\\)]+/g)]
      .map((m) => m[0])
      .filter((u) => !u.startsWith("https://svelte.dev/") && !u.startsWith("http://www.w3.org/"));
    expect(urls).toEqual([]);
    expect(readFileSync(cssPath, "utf8")).not.toMatch(/url\(\s*['"]?https?:/);
  });

  test("is an IIFE that mounts without module loading", () => {
    const js = readFileSync(appPath, "utf8");
    expect(js).not.toMatch(/^\s*import /m);
    expect(js).toContain("__REVIEW_DATA__");
  });
});
