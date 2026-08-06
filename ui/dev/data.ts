// Sample diff + analysis for `bun run dev:ui`. The vite dev server runs these
// through the real buildReviewPayload (shiki highlighting, mermaid
// pre-rendering) so the dev UI matches production output exactly.
import type { Analysis } from "../../src/analysis";

export const DIFF = `diff --git a/src/fetch.ts b/src/fetch.ts
index 0000000..1111111 100644
--- a/src/fetch.ts
+++ b/src/fetch.ts
@@ -10,8 +10,16 @@
 export async function fetchJson(url: string) {
-  const res = await fetch(url);
+  const res = await fetchWithRetry(url, 3);
   if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
   return res.json();
 }
+
+async function fetchWithRetry(url: string, tries: number) {
+  for (let i = 0; i < tries; i++) {
+    try {
+      return await fetch(url);
+    } catch (e) {
+      await sleep(2 ** i * 100);
+    }
+  }
+  return fetch(url);
+}
@@ -40,2 +48,4 @@
 export function sleep(ms: number) {
+  if (ms < 0) throw new RangeError("negative sleep");
   return new Promise((r) => setTimeout(r, ms));
 }
diff --git a/test/fetch.test.ts b/test/fetch.test.ts
index 0000000..1111111 100644
--- a/test/fetch.test.ts
+++ b/test/fetch.test.ts
@@ -1,4 +1,7 @@
 import { fetchJson } from "../src/fetch";
-test("fetches", async () => {
+test("fetches json", async () => {
+  // retry path is not covered
+  expect(await fetchJson("/ok")).toEqual({ ok: true });
+});
`;

export const ANALYSES: { backend: string; analysis: Analysis }[] = [
  {
    backend: "anthropic",
    analysis: {
      title: "Add retry with backoff to the fetch layer",
      summary:
        "fetchJson now retries transient network failures three times with exponential backoff before giving up.",
      diagram: "flowchart LR\n  fetchJson --> fetchWithRetry\n  fetchWithRetry --> fetch\n  fetchWithRetry --> sleep",
      sections: [
        {
          heading: "Retry loop",
          intro: "The core change: `fetchJson` delegates to a new `fetchWithRetry` helper.",
          diagram: "",
          snippets: [
            { hunk_id: "h1", from: 10, to: 12, note: "call site swaps to the helper" },
            { hunk_id: "h1", from: 17, to: 25, note: "" },
          ],
        },
        {
          heading: "Guard rail in sleep",
          intro: "`sleep` now rejects negative durations.",
          diagram: "",
          snippets: [{ hunk_id: "h2", from: null, to: null, note: "" }],
        },
      ],
      findings: [
        {
          title: "Final attempt swallows the loop's purpose",
          severity: "major",
          hunk_id: "h1",
          line: 25,
          body: "After the loop exhausts its tries, the function issues one extra un-counted fetch. A caller asking for 3 tries gets 4, and the last error from the loop is discarded silently.",
          recommendation: "Rethrow the last caught error instead of issuing a fourth fetch.",
        },
        {
          title: "Retry ignores HTTP status",
          severity: "minor",
          hunk_id: "h1",
          line: 21,
          body: "Only thrown (network) errors are retried; 5xx responses return immediately.",
          recommendation: "Consider retrying on res.status >= 500 as well, if that matches the API's semantics.",
        },
        {
          title: "Retry path untested",
          severity: "info",
          hunk_id: "h3",
          line: 4,
          body: "The new test covers the happy path only; the retry/backoff loop has no coverage.",
          recommendation: "",
        },
      ],
      notes: ["Backoff starts at 100ms and doubles; worst case ~700ms of extra latency before failure."],
    },
  },
  {
    backend: "codex",
    analysis: {
      title: "Fetch retry",
      summary: "Adds a bounded retry helper around fetch.",
      diagram: "",
      sections: [
        {
          heading: "The helper",
          intro: "One new function, one call-site change.",
          diagram: "",
          snippets: [{ hunk_id: "h1", from: 17, to: 26, note: "" }],
        },
      ],
      findings: [],
      notes: [],
    },
  },
];
