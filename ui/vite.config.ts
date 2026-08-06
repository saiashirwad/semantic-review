import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Dev-only stand-ins for the CLI: /dev/payload.json builds the fixture
// through the real payload pipeline (Pierre diffs, mermaid pre-rendering),
// and /done logs the posted review — so the full loop works from
// `bun run dev:ui` without running the CLI.
function devServer(): Plugin {
  return {
    name: "semantic-review-dev-server",
    configureServer(server) {
      server.middlewares.use("/dev/payload.json", async (_req, res) => {
        const [{ parseDiff }, { buildReviewPayload }, { DIFF, ANALYSES }] = await Promise.all([
          import("../src/diff.ts"),
          import("../src/payload.ts"),
          import("./dev/data.ts"),
        ]);
        const payload = await buildReviewPayload(ANALYSES, parseDiff(DIFF), "server");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(payload));
      });
      server.middlewares.use("/done", (req, res) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          console.log("\n--- POST /done ---\n" + body + "\n");
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true }));
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [svelte(), devServer()],
  // Pixel fonts must ship inside the offline CSS bundle (no remote loads).
  build: {
    lib: {
      entry: "src/main.ts",
      formats: ["iife"],
      name: "SemanticReview",
      fileName: () => "app.js",
      cssFileName: "style",
    },
    outDir: "../dist/ui",
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000,
  },
});
