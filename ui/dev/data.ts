// Sample diff + analysis for `bun run dev:ui`. The vite dev server runs these
// through the real buildReviewPayload (Pierre diffs, mermaid pre-rendering)
// so the dev UI matches production output exactly.
//
// Intentionally large: multi-file PR shape so the walkthrough, findings rail,
// full diff, notes, and diagrams all have something to show.
import type { Analysis } from "../../src/analysis.ts";

export const DIFF = `diff --git a/src/retry.ts b/src/retry.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/src/retry.ts
@@ -0,0 +1,78 @@
+import type { RetryPolicy } from "./config";
+
+export type RetryReason = "network" | "http" | "timeout";
+
+export interface RetryAttempt {
+  try: number;
+  reason: RetryReason;
+  delayMs: number;
+  error?: unknown;
+  status?: number;
+}
+
+export interface RetryHooks {
+  onAttempt?: (attempt: RetryAttempt) => void;
+  shouldRetry?: (res: Response | null, err: unknown) => boolean;
+}
+
+/** Exponential backoff with full jitter. Cap at policy.maxDelayMs. */
+export function backoffMs(tryIndex: number, policy: RetryPolicy): number {
+  const exp = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** tryIndex);
+  // full jitter — avoids thundering herd when many clients fail together
+  return Math.floor(Math.random() * exp);
+}
+
+export function defaultShouldRetry(res: Response | null, err: unknown): boolean {
+  if (err) return true;
+  if (!res) return false;
+  // retry transient server / rate-limit responses
+  return res.status === 408 || res.status === 429 || res.status >= 500;
+}
+
+export async function withRetry<T>(
+  policy: RetryPolicy,
+  run: (signal: AbortSignal) => Promise<T>,
+  hooks: RetryHooks = {},
+): Promise<T> {
+  const shouldRetry = hooks.shouldRetry ?? defaultShouldRetry;
+  let lastError: unknown;
+
+  for (let i = 0; i < policy.tries; i++) {
+    const controller = new AbortController();
+    const timer = setTimeout(() => controller.abort(), policy.timeoutMs);
+    try {
+      const value = await run(controller.signal);
+      // Response-shaped results: retry on bad status if the runner returned one
+      if (value instanceof Response && shouldRetry(value, null) && i < policy.tries - 1) {
+        const delay = backoffMs(i, policy);
+        hooks.onAttempt?.({ try: i + 1, reason: "http", delayMs: delay, status: value.status });
+        await sleep(delay);
+        continue;
+      }
+      return value;
+    } catch (err) {
+      lastError = err;
+      const reason: RetryReason = err instanceof DOMException && err.name === "AbortError" ? "timeout" : "network";
+      if (!shouldRetry(null, err) || i === policy.tries - 1) throw err;
+      const delay = backoffMs(i, policy);
+      hooks.onAttempt?.({ try: i + 1, reason, delayMs: delay, error: err });
+      await sleep(delay);
+    } finally {
+      clearTimeout(timer);
+    }
+  }
+
+  throw lastError ?? new Error("retry exhausted");
+}
+
+export function sleep(ms: number): Promise<void> {
+  if (ms < 0) throw new RangeError("negative sleep");
+  if (ms === 0) return Promise.resolve();
+  return new Promise((r) => setTimeout(r, ms));
+}
diff --git a/src/config.ts b/src/config.ts
index 0000000..1111111 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,12 +1,34 @@
-export interface ClientConfig {
-  baseUrl: string;
-  headers?: Record<string, string>;
-}
-
-export const defaults: ClientConfig = {
-  baseUrl: "https://api.example.com",
-  headers: { Accept: "application/json" },
-};
+export interface RetryPolicy {
+  /** Total attempts including the first. */
+  tries: number;
+  baseDelayMs: number;
+  maxDelayMs: number;
+  timeoutMs: number;
+}
+
+export interface ClientConfig {
+  baseUrl: string;
+  headers?: Record<string, string>;
+  retry?: Partial<RetryPolicy>;
+}
+
+export const DEFAULT_RETRY: RetryPolicy = {
+  tries: 3,
+  baseDelayMs: 100,
+  maxDelayMs: 2_000,
+  timeoutMs: 10_000,
+};
+
+export const defaults: ClientConfig = {
+  baseUrl: "https://api.example.com",
+  headers: { Accept: "application/json" },
+  retry: DEFAULT_RETRY,
+};
+
+export function resolveRetry(partial?: Partial<RetryPolicy>): RetryPolicy {
+  return { ...DEFAULT_RETRY, ...partial };
+}
diff --git a/src/fetch.ts b/src/fetch.ts
index 0000000..1111111 100644
--- a/src/fetch.ts
+++ b/src/fetch.ts
@@ -1,28 +1,62 @@
-import { defaults, type ClientConfig } from "./config";
-
-export async function fetchJson<T = unknown>(
-  path: string,
-  init?: RequestInit,
-  config: ClientConfig = defaults,
-): Promise<T> {
-  const url = new URL(path, config.baseUrl).toString();
-  const res = await fetch(url, {
-    ...init,
-    headers: { ...config.headers, ...init?.headers },
-  });
-  if (!res.ok) throw new HttpError(res.status, await res.text());
-  return res.json() as Promise<T>;
-}
-
-export class HttpError extends Error {
-  constructor(
-    public status: number,
-    public body: string,
-  ) {
-    super(\`HTTP \${status}\`);
-    this.name = "HttpError";
-  }
-}
+import { defaults, resolveRetry, type ClientConfig } from "./config";
+import { withRetry, type RetryHooks } from "./retry";
+
+export async function fetchJson<T = unknown>(
+  path: string,
+  init?: RequestInit,
+  config: ClientConfig = defaults,
+  hooks?: RetryHooks,
+): Promise<T> {
+  const url = new URL(path, config.baseUrl).toString();
+  const policy = resolveRetry(config.retry);
+
+  const res = await withRetry(
+    policy,
+    (signal) =>
+      fetch(url, {
+        ...init,
+        signal: init?.signal ?? signal,
+        headers: { ...config.headers, ...init?.headers },
+      }),
+    hooks,
+  );
+
+  if (!res.ok) throw new HttpError(res.status, await res.text());
+  return res.json() as Promise<T>;
+}
+
+export async function fetchText(
+  path: string,
+  init?: RequestInit,
+  config: ClientConfig = defaults,
+): Promise<string> {
+  const url = new URL(path, config.baseUrl).toString();
+  const policy = resolveRetry(config.retry);
+  const res = await withRetry(policy, (signal) =>
+    fetch(url, { ...init, signal: init?.signal ?? signal }),
+  );
+  if (!res.ok) throw new HttpError(res.status, await res.text());
+  return res.text();
+}
+
+export class HttpError extends Error {
+  constructor(
+    public status: number,
+    public body: string,
+  ) {
+    super(\`HTTP \${status}\`);
+    this.name = "HttpError";
+  }
+}
+
+/** @deprecated use fetchJson */
+export async function getJson<T = unknown>(path: string): Promise<T> {
+  return fetchJson<T>(path);
+}
diff --git a/src/client.ts b/src/client.ts
index 0000000..1111111 100644
--- a/src/client.ts
+++ b/src/client.ts
@@ -1,22 +1,48 @@
-import { fetchJson } from "./fetch";
-import { defaults, type ClientConfig } from "./config";
-
-export class ApiClient {
-  constructor(private config: ClientConfig = defaults) {}
-
-  user(id: string) {
-    return fetchJson<{ id: string; name: string }>(\`/users/\${id}\`, undefined, this.config);
-  }
-
-  listUsers() {
-    return fetchJson<{ id: string; name: string }[]>("/users", undefined, this.config);
-  }
-}
+import { fetchJson, fetchText, HttpError } from "./fetch";
+import { defaults, type ClientConfig } from "./config";
+import type { RetryAttempt } from "./retry";
+
+export class ApiClient {
+  private attempts: RetryAttempt[] = [];
+
+  constructor(private config: ClientConfig = defaults) {}
+
+  get lastAttempts(): readonly RetryAttempt[] {
+    return this.attempts;
+  }
+
+  user(id: string) {
+    return this.request<{ id: string; name: string }>(\`/users/\${id}\`);
+  }
+
+  listUsers() {
+    return this.request<{ id: string; name: string }[]>("/users");
+  }
+
+  raw(path: string) {
+    return fetchText(path, undefined, this.config);
+  }
+
+  private async request<T>(path: string): Promise<T> {
+    this.attempts = [];
+    try {
+      return await fetchJson<T>(path, undefined, this.config, {
+        onAttempt: (a) => this.attempts.push(a),
+      });
+    } catch (err) {
+      if (err instanceof HttpError && err.status === 401) {
+        // surface auth failures without retry noise
+        this.attempts = [];
+      }
+      throw err;
+    }
+  }
+}
diff --git a/src/index.ts b/src/index.ts
index 0000000..1111111 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,4 +1,8 @@
-export { fetchJson, HttpError } from "./fetch";
-export { ApiClient } from "./client";
-export { defaults, type ClientConfig } from "./config";
+export { fetchJson, fetchText, getJson, HttpError } from "./fetch";
+export { ApiClient } from "./client";
+export { defaults, DEFAULT_RETRY, resolveRetry, type ClientConfig, type RetryPolicy } from "./config";
+export {
+  withRetry,
+  backoffMs,
+  sleep,
+  type RetryAttempt,
+  type RetryHooks,
+  type RetryReason,
+} from "./retry";
diff --git a/test/fetch.test.ts b/test/fetch.test.ts
index 0000000..1111111 100644
--- a/test/fetch.test.ts
+++ b/test/fetch.test.ts
@@ -1,18 +1,56 @@
-import { describe, expect, test, mock } from "bun:test";
-import { fetchJson, HttpError } from "../src/fetch";
-
-describe("fetchJson", () => {
-  test("parses json on 200", async () => {
-    mock.module("node:fetch", () => ({
-      fetch: async () => new Response(JSON.stringify({ ok: true })),
-    }));
-    expect(await fetchJson("/ok")).toEqual({ ok: true });
-  });
-
-  test("throws HttpError on 404", async () => {
-    // ...
-  });
-});
+import { describe, expect, test, mock, beforeEach } from "bun:test";
+import { fetchJson, fetchText, HttpError } from "../src/fetch";
+import { DEFAULT_RETRY } from "../src/config";
+
+describe("fetchJson", () => {
+  beforeEach(() => {
+    mock.restore();
+  });
+
+  test("parses json on 200", async () => {
+    globalThis.fetch = mock(async () => new Response(JSON.stringify({ ok: true }))) as typeof fetch;
+    expect(await fetchJson("/ok", undefined, { baseUrl: "https://x.test", retry: { tries: 1 } })).toEqual({
+      ok: true,
+    });
+  });
+
+  test("throws HttpError on 404 without retrying", async () => {
+    let calls = 0;
+    globalThis.fetch = mock(async () => {
+      calls++;
+      return new Response("missing", { status: 404 });
+    }) as typeof fetch;
+
+    await expect(
+      fetchJson("/nope", undefined, { baseUrl: "https://x.test", retry: { tries: 3 } }),
+    ).rejects.toBeInstanceOf(HttpError);
+    expect(calls).toBe(1);
+  });
+
+  test("retries on 503 then succeeds", async () => {
+    let calls = 0;
+    globalThis.fetch = mock(async () => {
+      calls++;
+      if (calls < 3) return new Response("busy", { status: 503 });
+      return new Response(JSON.stringify({ ok: true }));
+    }) as typeof fetch;
+
+    const result = await fetchJson("/flaky", undefined, {
+      baseUrl: "https://x.test",
+      retry: { ...DEFAULT_RETRY, baseDelayMs: 0, maxDelayMs: 0 },
+    });
+    expect(result).toEqual({ ok: true });
+    expect(calls).toBe(3);
+  });
+});
+
+describe("fetchText", () => {
+  test("returns body string", async () => {
+    globalThis.fetch = mock(async () => new Response("hello")) as typeof fetch;
+    expect(await fetchText("/hi", undefined, { baseUrl: "https://x.test", retry: { tries: 1 } })).toBe("hello");
+  });
+});
diff --git a/test/retry.test.ts b/test/retry.test.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/test/retry.test.ts
@@ -0,0 +1,64 @@
+import { describe, expect, test } from "bun:test";
+import { backoffMs, defaultShouldRetry, sleep, withRetry } from "../src/retry";
+import { DEFAULT_RETRY } from "../src/config";
+
+describe("backoffMs", () => {
+  test("stays within [0, max]", () => {
+    for (let i = 0; i < 20; i++) {
+      const ms = backoffMs(i, { ...DEFAULT_RETRY, baseDelayMs: 50, maxDelayMs: 200 });
+      expect(ms).toBeGreaterThanOrEqual(0);
+      expect(ms).toBeLessThanOrEqual(200);
+    }
+  });
+});
+
+describe("defaultShouldRetry", () => {
+  test("retries network errors", () => {
+    expect(defaultShouldRetry(null, new Error("ECONNRESET"))).toBe(true);
+  });
+
+  test("retries 429 and 5xx", () => {
+    expect(defaultShouldRetry(new Response(null, { status: 429 }), null)).toBe(true);
+    expect(defaultShouldRetry(new Response(null, { status: 502 }), null)).toBe(true);
+  });
+
+  test("does not retry 400", () => {
+    expect(defaultShouldRetry(new Response(null, { status: 400 }), null)).toBe(false);
+  });
+});
+
+describe("withRetry", () => {
+  test("returns on first success", async () => {
+    let calls = 0;
+    const value = await withRetry({ ...DEFAULT_RETRY, tries: 3, timeoutMs: 1000 }, async () => {
+      calls++;
+      return 42;
+    });
+    expect(value).toBe(42);
+    expect(calls).toBe(1);
+  });
+
+  test("exhausts tries then throws", async () => {
+    let calls = 0;
+    await expect(
+      withRetry({ tries: 3, baseDelayMs: 0, maxDelayMs: 0, timeoutMs: 1000 }, async () => {
+        calls++;
+        throw new Error("nope");
+      }),
+    ).rejects.toThrow("nope");
+    expect(calls).toBe(3);
+  });
+});
+
+describe("sleep", () => {
+  test("rejects negative", () => {
+    expect(() => sleep(-1)).toThrow(RangeError);
+  });
+});
diff --git a/README.md b/README.md
index 0000000..1111111 100644
--- a/README.md
+++ b/README.md
@@ -12,6 +12,18 @@ Tiny HTTP client used by internal tools.
 npm install
 \`\`\`
 
+## Retries
+
+All requests go through \`withRetry\` with exponential backoff + full jitter:
+
+| Option | Default |
+|--------|---------|
+| tries | 3 |
+| baseDelayMs | 100 |
+| maxDelayMs | 2000 |
+| timeoutMs | 10000 |
+
+Override per client via \`config.retry\`.
+
 ## Usage
 
 \`\`\`ts
diff --git a/packages/http/src/internal/retry/jitter.ts b/packages/http/src/internal/retry/jitter.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/packages/http/src/internal/retry/jitter.ts
@@ -0,0 +1,12 @@
+/** Full jitter in [0, cap]. */
+export function fullJitter(cap: number): number {
+  if (cap <= 0) return 0;
+  return Math.floor(Math.random() * cap);
+}
+
+/** Decorrelated jitter step (AWS-style). */
+export function decorrelated(prev: number, base: number, cap: number): number {
+  const next = Math.floor(base + Math.random() * prev * 3);
+  return Math.min(cap, next);
+}
diff --git a/packages/http/src/internal/retry/policy.ts b/packages/http/src/internal/retry/policy.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/packages/http/src/internal/retry/policy.ts
@@ -0,0 +1,14 @@
+export type RetryPolicy = {
+  tries: number;
+  baseDelayMs: number;
+  maxDelayMs: number;
+  timeoutMs: number;
+};
+
+export const DEFAULT_POLICY: RetryPolicy = {
+  tries: 3,
+  baseDelayMs: 100,
+  maxDelayMs: 2_000,
+  timeoutMs: 10_000,
+};
diff --git a/packages/http/src/client/adapters/fetch.ts b/packages/http/src/client/adapters/fetch.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/packages/http/src/client/adapters/fetch.ts
@@ -0,0 +1,16 @@
+import type { RetryPolicy } from "../../internal/retry/policy";
+import { fullJitter } from "../../internal/retry/jitter";
+
+export async function fetchWithRetry(
+  input: RequestInfo,
+  init: RequestInit | undefined,
+  policy: RetryPolicy,
+): Promise<Response> {
+  let last: unknown;
+  for (let i = 0; i < policy.tries; i++) {
+    try {
+      return await fetch(input, init);
+    } catch (err) {
+      last = err;
+      if (i === policy.tries - 1) break;
+      await new Promise((r) => setTimeout(r, fullJitter(policy.baseDelayMs * 2 ** i)));
+    }
+  }
+  throw last;
+}
diff --git a/packages/http/src/client/adapters/node-http.ts b/packages/http/src/client/adapters/node-http.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/packages/http/src/client/adapters/node-http.ts
@@ -0,0 +1,8 @@
+/** Node http adapter stub — packages tree depth fixture. */
+export function createNodeAdapter() {
+  return {
+    kind: "node-http" as const,
+    request: async () => {
+      throw new Error("not implemented in fixture");
+    },
+  };
+}
diff --git a/apps/api/src/routes/v1/users/handlers.ts b/apps/api/src/routes/v1/users/handlers.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/apps/api/src/routes/v1/users/handlers.ts
@@ -0,0 +1,11 @@
+import type { RetryPolicy } from "../../../../../../packages/http/src/internal/retry/policy";
+
+export async function listUsers(policy: RetryPolicy) {
+  // deep path fixture for the files tree
+  return { users: [], policy };
+}
+
+export async function getUser(id: string) {
+  return { id, name: "fixture" };
+}
diff --git a/apps/api/src/routes/v1/users/schema.ts b/apps/api/src/routes/v1/users/schema.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/apps/api/src/routes/v1/users/schema.ts
@@ -0,0 +1,6 @@
+export type User = {
+  id: string;
+  name: string;
+  email?: string;
+};
diff --git a/apps/api/src/middleware/auth/session.ts b/apps/api/src/middleware/auth/session.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/apps/api/src/middleware/auth/session.ts
@@ -0,0 +1,10 @@
+export type Session = {
+  userId: string;
+  expiresAt: number;
+};
+
+export function isExpired(session: Session, now = Date.now()): boolean {
+  return session.expiresAt <= now;
+}
diff --git a/apps/api/src/middleware/auth/tokens/refresh.ts b/apps/api/src/middleware/auth/tokens/refresh.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/apps/api/src/middleware/auth/tokens/refresh.ts
@@ -0,0 +1,9 @@
+/** Nested under middleware/auth/tokens — depth fixture. */
+export function rotateRefreshToken(old: string): string {
+  return \`rotated:\${old}\`;
+}
diff --git a/vendor/legacy/lib/utils/deep/nested/helper.ts b/vendor/legacy/lib/utils/deep/nested/helper.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/vendor/legacy/lib/utils/deep/nested/helper.ts
@@ -0,0 +1,7 @@
+/** Intentionally deep path for files-tree UI fixture. */
+export function deepIdentity<T>(value: T): T {
+  return value;
+}
diff --git a/vendor/legacy/lib/utils/deep/nested/more/stuff.ts b/vendor/legacy/lib/utils/deep/nested/more/stuff.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/vendor/legacy/lib/utils/deep/nested/more/stuff.ts
@@ -0,0 +1,5 @@
+export const DEEP_FIXTURE_FLAG = true;
`;

const analysis: Analysis = {
  title: "Add configurable retry with backoff across the HTTP client",
  summary:
    "Introduces a shared `withRetry` helper (exponential backoff + full jitter, per-attempt timeout, HTTP-aware retry policy), wires it into `fetchJson`/`fetchText` and `ApiClient`, and covers the happy path plus a 503 retry in tests. Config grows a `RetryPolicy` with sensible defaults.",
  // Flat layered TB — no subgraphs. Clusters force empty panels and
  // route edges through title bars (looked broken with arrowheads).
  diagram: `flowchart TB
  ApiClient --> fetchJson
  ApiClient --> fetchText
  fetchJson --> withRetry
  fetchText --> withRetry
  resolveRetry --> withRetry
  withRetry --> backoffMs
  withRetry --> defaultShouldRetry
  withRetry --> fetch`,
  sections: [
    {
      heading: "New retry primitive",
      deck: "Adds withRetry with jittered backoff, retry predicate, and per-try timeout",
      intro:
        "The heart of the change is a new `src/retry.ts`: typed attempt hooks, full-jitter backoff, default retry predicate for network errors / 408 / 429 / 5xx, and `withRetry` that owns the loop + per-try abort timeout.",
      diagram: `sequenceDiagram
  participant C as caller
  participant R as withRetry
  participant F as run()
  C->>R: withRetry(policy, run)
  loop tries
    R->>F: run(signal)
    alt success / non-retryable
      F-->>R: value
      R-->>C: value
    else retryable
      F-->>R: err / bad Response
      R->>R: backoffMs + sleep
    end
  end`,
      snippets: [
        {
          hunk_id: "h1",
          from: 20,
          to: 32,
          note: "Backoff uses full jitter; delay is random in [0, exp]",
        },
        {
          hunk_id: "h1",
          from: 34,
          to: 68,
          note: "Loop retries both thrown errors and Response statuses",
        },
      ],
    },
    {
      heading: "Config surface",
      deck: "ClientConfig grows an optional retry policy with sensible defaults",
      intro:
        "`ClientConfig` gains an optional `retry` partial. `DEFAULT_RETRY` and `resolveRetry` keep call sites short while letting tests zero out delays.",
      diagram: "",
      snippets: [
        {
          hunk_id: "h2",
          from: 1,
          to: 34,
          note: "Policy fields: tries, base/max delay, per-attempt timeout",
        },
      ],
    },
    {
      heading: "Wiring fetch + client",
      deck: "fetchJson/fetchText route through withRetry; ApiClient logs attempts",
      intro:
        "`fetchJson` delegates to `withRetry` and accepts optional hooks. A new `fetchText` twin shares the same path. `ApiClient` records attempts for debugging and special-cases 401.",
      diagram: "",
      snippets: [
        {
          hunk_id: "h3",
          from: 8,
          to: 28,
          note: "Caller signal wins over the per-try abort signal",
        },
        {
          hunk_id: "h4",
          from: 20,
          to: 48,
          note: "ApiClient.request clears attempt log on 401",
        },
        {
          hunk_id: "h5",
          from: null,
          to: null,
          note: "Public barrel re-exports the new symbols",
        },
      ],
    },
    {
      heading: "Tests & docs",
      deck: "Covers happy path plus 503 retry; README documents the defaults",
      intro:
        "Fetch tests now cover no-retry on 404 and retry-on-503. New `retry.test.ts` unit-tests backoff bounds, the predicate, exhaustion, and `sleep`. README documents the defaults table.",
      diagram: "",
      snippets: [
        {
          hunk_id: "h6",
          from: 20,
          to: 48,
          note: "503 test zeroes delays so it stays fast",
        },
        {
          hunk_id: "h7",
          from: 40,
          to: 58,
          note: "Exhaustion path asserts exactly policy.tries calls",
        },
        {
          hunk_id: "h8",
          from: 15,
          to: 28,
          note: "",
        },
      ],
    },
  ],
  findings: [
    {
      title: "Caller AbortSignal is replaced, not composed",
      severity: "critical",
      hunk_id: "h3",
      line: 18,
      body: "`signal: init?.signal ?? signal` means a caller-provided AbortSignal is used *instead of* the per-try timeout signal. If the caller passes a long-lived signal, the 10s timeout never fires. If they omit it, the caller cannot cancel across retries — each try gets a fresh controller.",
      recommendation:
        "Compose signals (AbortSignal.any([init?.signal, signal]) where available, or abort the try controller when the outer signal aborts).",
    },
    {
      title: "Successful Response with retryable status is dropped without body cleanup",
      severity: "major",
      hunk_id: "h1",
      line: 48,
      body: "When `value instanceof Response` is retryable, the code `continue`s without reading or cancelling the body. Under fetch, unread bodies can pin sockets and stall the connection pool under load.",
      recommendation: "Call `void value.body?.cancel()` (or `await value.arrayBuffer()`) before sleeping/retrying.",
    },
    {
      title: "withRetry generic pretends Response-shaped T",
      severity: "major",
      hunk_id: "h1",
      line: 46,
      body: "`value instanceof Response` couples the generic helper to fetch. Callers using `withRetry` for non-Response work still pay the branch; worse, a custom runner that returns a Response subclass for a non-HTTP purpose could be retried unexpectedly.",
      recommendation:
        "Split `withRetry` (errors only) from `withFetchRetry` (Response-aware), or require an explicit `isRetryableResult` hook instead of `instanceof`.",
    },
    {
      title: "Math.random backoff is untestable / non-deterministic",
      severity: "minor",
      hunk_id: "h1",
      line: 22,
      body: "Full jitter is right for production, but `backoffMs` always hits `Math.random` with no seed/injectable RNG. The unit test only asserts bounds — it cannot lock a schedule or prove the cap math.",
      recommendation: "Accept an optional `random = Math.random` parameter on `backoffMs` / policy for tests.",
    },
    {
      title: "401 clears attempt history — loses debug signal",
      severity: "minor",
      hunk_id: "h4",
      line: 35,
      body: "`ApiClient.request` wipes `this.attempts` on 401. That hides whether the client retried before seeing auth failure (e.g. a 503 then 401), which is exactly when attempt logs help.",
      recommendation: "Leave attempts intact; let the caller decide. If silence is desired, gate it behind a flag.",
    },
    {
      title: "getJson deprecated alias still exported from the barrel",
      severity: "info",
      hunk_id: "h3",
      line: 53,
      body: "A brand-new `getJson` is immediately marked `@deprecated` and re-exported from `index.ts`. That freezes a migration shim into the first release of the module graph.",
      recommendation: "Drop it until a real caller needs a compat path, or don't export it from the root barrel.",
    },
    {
      title: "README table duplicates DEFAULT_RETRY by hand",
      severity: "info",
      hunk_id: "h8",
      line: 20,
      body: "Docs hard-code 3 / 100 / 2000 / 10000. Future policy tweaks will drift from the README.",
      recommendation: "Generate the table from `DEFAULT_RETRY` in docs CI, or point readers at the constant in `config.ts`.",
    },
    {
      title: "No test that caller signal cancels in-flight tries",
      severity: "info",
      hunk_id: "h7",
      line: 48,
      body: "Retry exhaustion and 503 success are covered; abort/cancel behavior — the riskiest part of the signal wiring — is not.",
      recommendation: "Add a test that aborts mid-flight and asserts no further tries are scheduled.",
    },
  ],
  notes: [
    "Worst-case delay before failure is roughly sum of full-jitter caps (not base*2^i). With defaults, expect up to ~3s of sleep plus 3× timeoutMs if every try hangs until abort.",
    "Full jitter is correct for multi-tenant clients; if you need strictly increasing delays for a single interactive tool, consider decorrelated jitter instead.",
    "retry policy is shallow-merged in resolveRetry — nested objects are not a concern today, but a future `headers` style field would need care.",
    "Binary-adjacent: nothing here touches streaming response bodies beyond the unread-Response retry path noted in findings.",
  ],
};

export const ANALYSES: { backend: string; analysis: Analysis }[] = [
  { backend: "analysis", analysis },
];
