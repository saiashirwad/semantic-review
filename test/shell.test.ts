import { describe, expect, test } from "bun:test";
import type { Analysis } from "../src/analysis.ts";
import { parseDiff } from "../src/diff.ts";
import { buildReviewPayload } from "../src/payload.ts";
import { renderShell, type UiAssets } from "../src/shell.ts";

const STUB_ASSETS: UiAssets = { js: "/* stub app */", css: "/* stub css */" };

const DIFF = 'diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-old\n+const s = "</script><script>alert(1)</script>";\n';

const analysis = (summary = "Summary"): Analysis => ({
  title: "Change",
  summary,
  diagram: "",
  sections: [{ heading: "Update", intro: "Intro", diagram: "", snippets: [{ hunk_id: "h1", from: 1, to: 1, note: "" }] }],
  findings: [],
  notes: ["Check it."],
});

describe("renderShell", () => {
  test("inlines everything with no remote URLs", async () => {
    const payload = await buildReviewPayload([{ backend: "openai", analysis: analysis() }], parseDiff(DIFF), "export");
    const html = renderShell(payload, STUB_ASSETS);
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).toContain("<style>\n/* stub css */");
    expect(html).toContain("/* stub app */");
    expect(html).toContain('<div id="app">');
  });

  test("embeds the payload with mode and escapes </script> breakout", async () => {
    const payload = await buildReviewPayload([{ backend: "openai", analysis: analysis() }], parseDiff(DIFF), "export");
    const html = renderShell(payload, STUB_ASSETS);
    expect(html).toContain('"mode":"export"');
    const dataScript = html.slice(html.indexOf("window.__REVIEW_DATA__"));
    expect(dataScript.slice(0, dataScript.indexOf("</script>"))).not.toContain("</script>");
    expect(html).toContain("\\u003c");
  });

  test("server mode marks the payload accordingly", async () => {
    const payload = await buildReviewPayload([{ backend: "openai", analysis: analysis() }], parseDiff(DIFF), "server");
    const html = renderShell(payload, STUB_ASSETS);
    expect(html).toContain('"mode":"server"');
  });

  test("multi-result payloads carry every backend", async () => {
    const payload = await buildReviewPayload(
      [
        { backend: "anthropic", analysis: analysis("First analysis") },
        { backend: "openai", analysis: analysis("Second analysis") },
      ],
      parseDiff(DIFF),
      "export",
    );
    const html = renderShell(payload, STUB_ASSETS);
    expect(html).toContain('"backend":"anthropic"');
    expect(html).toContain('"backend":"openai"');
    expect(html).toContain("First analysis");
    expect(html).toContain("Second analysis");
  });

  test("escapes the title in <title>", async () => {
    const payload = await buildReviewPayload(
      [{ backend: "x", analysis: { ...analysis(), title: "<img src=x>" } }],
      parseDiff(DIFF),
      "export",
    );
    const html = renderShell(payload, STUB_ASSETS);
    expect(html).toContain("<title>&lt;img src=x&gt; — semantic-review</title>");
  });

  test("escapes </script sequences inside the app bundle", async () => {
    const payload = await buildReviewPayload([{ backend: "x", analysis: analysis() }], parseDiff(DIFF), "export");
    const html = renderShell(payload, { js: 'const x = "</script>";', css: "" });
    expect(html).toContain('const x = "<\\/script>";');
  });
});
