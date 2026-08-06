import { describe, expect, test } from "bun:test";
import { HARNESSES, harnessBackend, type HarnessDefinition } from "../src/harness";
import { BACKENDS } from "../src/backends";
import type { RunResult } from "../src/proc";

const ANALYSIS = JSON.stringify({
  title: "t",
  summary: "s",
  diagram: "",
  sections: [],
  findings: [],
  notes: [],
});

function stubRunner(calls: { argv: string[]; stdin?: string }[], result: Partial<RunResult> = {}) {
  return async (argv: string[], stdin?: string): Promise<RunResult> => {
    calls.push({ argv, stdin });
    return { stdout: ANALYSIS, stderr: "", code: 0, ...result };
  };
}

const stdinDef: HarnessDefinition = {
  name: "fake",
  command: "fake",
  promptVia: "stdin",
  argv: (o) => ["fake", "-p", ...(o.model ? ["--model", o.model] : [])],
};

const argDef: HarnessDefinition = { ...stdinDef, name: "fake-arg", promptVia: "arg" };

describe("harnessBackend", () => {
  test("stdin harness writes the prompt to stdin", async () => {
    const calls: { argv: string[]; stdin?: string }[] = [];
    const analysis = await harnessBackend(stdinDef, stubRunner(calls)).analyze("the diff", { model: "m1" });
    expect(analysis.title).toBe("t");
    expect(calls[0].argv).toEqual(["fake", "-p", "--model", "m1"]);
    expect(calls[0].stdin).toContain("the diff");
  });

  test("arg harness appends the prompt as the final argument", async () => {
    const calls: { argv: string[]; stdin?: string }[] = [];
    await harnessBackend(argDef, stubRunner(calls)).analyze("the diff", {});
    expect(calls[0].stdin).toBeUndefined();
    expect(calls[0].argv.at(-1)).toContain("the diff");
    expect(calls[0].argv.slice(0, 2)).toEqual(["fake", "-p"]);
  });

  test("arg harness rejects oversized prompts with a clear error", async () => {
    const calls: { argv: string[]; stdin?: string }[] = [];
    const huge = "x".repeat(900_000);
    expect(harnessBackend(argDef, stubRunner(calls)).analyze(huge, {})).rejects.toThrow("prompt too large");
    expect(calls).toHaveLength(0);
  });

  test("nonzero exit surfaces stderr", async () => {
    const calls: { argv: string[]; stdin?: string }[] = [];
    const backend = harnessBackend(stdinDef, stubRunner(calls, { code: 2, stderr: "boom" }));
    expect(backend.analyze("d", {})).rejects.toThrow("fake exited 2: boom");
  });

  test("availability checks the command, not argv", async () => {
    const calls: { argv: string[]; stdin?: string }[] = [];
    await harnessBackend(stdinDef, stubRunner(calls)).available();
    expect(calls[0].argv).toEqual(["sh", "-c", "command -v fake"]);
  });
});

describe("HARNESSES registry", () => {
  test("names are unique and registered in BACKENDS", () => {
    const names = HARNESSES.map((h) => h.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(BACKENDS[name]?.name).toBe(name);
  });

  test("includes opencode with arg-based prompt delivery", () => {
    const opencode = HARNESSES.find((h) => h.name === "opencode")!;
    expect(opencode.promptVia).toBe("arg");
    expect(opencode.argv({ model: "anthropic/claude-opus-5" })).toEqual([
      "opencode",
      "run",
      "-m",
      "anthropic/claude-opus-5",
    ]);
  });
});
