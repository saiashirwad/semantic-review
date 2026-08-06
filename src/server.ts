import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { spawn } from "node:child_process";
import { z } from "zod";
import type { ReviewResult } from "./review.ts";

const MAX_BODY = 2_000_000; // 2MB — review feedback is plaintext comments, not files

// Server-only: keep zod off review.ts so the browser bundle stays lean/offline.
const ReviewResultSchema = z.object({
  comments: z
    .array(
      z.object({
        ref: z.string(),
        quote: z.string().optional(),
        text: z.string(),
        backend: z.string().optional(),
      }),
    )
    .default([]),
  overall: z.string().default(""),
  notes: z
    .array(z.object({ backend: z.string(), items: z.array(z.string()) }))
    .optional(),
});

export interface ServeOpts {
  openBrowser?: boolean;
  /** Test hook: fired once the server is listening. */
  onListen?: (url: string) => void;
}

// Serves the report on localhost and resolves when the reviewer clicks Done.
export function serveReview(html: string, opts: ServeOpts = {}): Promise<ReviewResult> {
  const openBrowser = opts.openBrowser ?? true;

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const path = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
      if (path === "/" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }
      if (path === "/done" && req.method === "POST") {
        let body = "";
        let oversized = false;
        req.setEncoding("utf8");
        req.on("data", (chunk: string) => {
          if (oversized) return;
          body += chunk;
          if (body.length > MAX_BODY) {
            oversized = true;
            res.writeHead(413, { "Content-Type": "text/plain" });
            res.end("payload too large");
            req.destroy();
          }
        });
        req.on("end", () => {
          if (oversized || res.writableEnded) return;
          let parsed: unknown;
          try {
            parsed = JSON.parse(body);
          } catch {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("invalid JSON");
            return;
          }
          const result = ReviewResultSchema.safeParse(parsed);
          if (!result.success) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("invalid review result");
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }), () => {
            server.close();
            server.closeAllConnections();
            resolve(result.data);
          });
        });
        return;
      }
      res.writeHead(404);
      res.end("not found");
    });

    server.on("error", reject);

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("server failed to bind a port"));
        return;
      }
      const { port } = addr as AddressInfo;
      const url = `http://127.0.0.1:${port}/`;
      console.error(`semantic-review: review at ${url} — waiting for Done…`);
      opts.onListen?.(url);
      if (openBrowser) {
        const opener = process.platform === "darwin" ? "open" : "xdg-open";
        spawn(opener, [url], { stdio: "ignore" }).on("error", () => {});
      }
    });
  });
}
