import { describe, expect, test } from "bun:test";
import { serveReview } from "../src/server.ts";

describe("serveReview", () => {
  test("resolves with a validated review on Done", async () => {
    let url = "";
    const done = serveReview("<html>ok</html>", {
      openBrowser: false,
      onListen: (u) => {
        url = u;
      },
    });

    // Wait for listen
    for (let i = 0; i < 100 && !url; i++) await Bun.sleep(5);
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);

    const res = await fetch(new URL("/done", url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comments: [{ ref: "a.ts:1", text: "fix me" }],
        overall: "ship it",
      }),
    });
    expect(res.ok).toBe(true);
    expect(await done).toEqual({
      comments: [{ ref: "a.ts:1", text: "fix me" }],
      overall: "ship it",
    });
  });

  test("rejects invalid JSON without hanging", async () => {
    let url = "";
    const done = serveReview("<html>ok</html>", {
      openBrowser: false,
      onListen: (u) => {
        url = u;
      },
    });
    for (let i = 0; i < 100 && !url; i++) await Bun.sleep(5);

    const bad = await fetch(new URL("/done", url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    expect(bad.status).toBe(400);

    // Server still accepts a valid Done after a bad POST.
    const good = await fetch(new URL("/done", url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments: [], overall: "" }),
    });
    expect(good.ok).toBe(true);
    expect(await done).toEqual({ comments: [], overall: "" });
  });

  test("rejects bodies that fail the review schema", async () => {
    let url = "";
    const done = serveReview("<html>ok</html>", {
      openBrowser: false,
      onListen: (u) => {
        url = u;
      },
    });
    for (let i = 0; i < 100 && !url; i++) await Bun.sleep(5);

    const bad = await fetch(new URL("/done", url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments: "nope" }),
    });
    expect(bad.status).toBe(400);

    await fetch(new URL("/done", url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments: [], overall: "ok" }),
    });
    expect(await done).toEqual({ comments: [], overall: "ok" });
  });
});
