import { analysisPrompt, parseAnalysis } from "./analysis.ts";
import type { AnalyzeOpts, Backend } from "./backends.ts";
import { run } from "./proc.ts";

// A harness is a coding-agent CLI used as a one-shot analyzer: it gets the
// analysis prompt, prints JSON, and exits. It uses whatever auth the user
// already has. No repo access, no tools, no session.
export interface HarnessDefinition {
  name: string; // registry key, i.e. the --with name
  command: string; // binary checked for availability
  argv(opts: AnalyzeOpts): string[]; // full argv, WITHOUT the prompt
  promptVia: "stdin" | "arg"; // how the prompt is delivered
}

const modelFlag = (o: AnalyzeOpts, flag = "--model") => (o.model ? [flag, o.model] : []);

export const HARNESSES: HarnessDefinition[] = [
  {
    name: "claude",
    command: "claude",
    promptVia: "stdin",
    argv: (o) => ["claude", "-p", ...modelFlag(o)],
  },
  {
    name: "codex",
    command: "codex",
    promptVia: "stdin",
    argv: (o) => ["codex", "exec", "--skip-git-repo-check", ...modelFlag(o, "-m"), "-"],
  },
  {
    name: "gemini",
    command: "gemini",
    promptVia: "stdin",
    argv: (o) => ["gemini", ...modelFlag(o)],
  },
  {
    name: "pi",
    command: "pi",
    promptVia: "stdin",
    argv: (o) => ["pi", "-p", "--no-session", "--no-tools", ...modelFlag(o)],
  },
  {
    // opencode's `run` takes the prompt as a positional argument; it does not
    // read the prompt from stdin. Models are "provider/model", e.g.
    // "anthropic/claude-opus-5".
    name: "opencode",
    command: "opencode",
    promptVia: "arg",
    argv: (o) => ["opencode", "run", ...modelFlag(o, "-m")],
  },
];

// argv-delivered prompts are bounded by ARG_MAX (~1MB on macOS). Fail with a
// pointed message instead of an opaque E2BIG from spawn.
const MAX_ARG_PROMPT = 800_000;

type Runner = typeof run;

export function harnessBackend(def: HarnessDefinition, runner: Runner = run): Backend {
  return {
    name: def.name,
    available: () =>
      runner(["sh", "-c", `command -v ${def.command}`]).then(
        ({ code }) => code === 0,
        () => false,
      ),
    async analyze(annotatedDiff, opts) {
      const prompt = analysisPrompt(annotatedDiff);
      let result;
      if (def.promptVia === "arg") {
        if (prompt.length > MAX_ARG_PROMPT) {
          throw new Error(
            `prompt too large for ${def.name}'s argument-based input (${Math.round(prompt.length / 1000)}KB); ` +
              `use a smaller diff or another backend`,
          );
        }
        result = await runner([...def.argv(opts), prompt]);
      } else {
        result = await runner(def.argv(opts), prompt);
      }
      if (result.code !== 0) throw new Error(`${def.name} exited ${result.code}: ${result.stderr.slice(0, 500)}`);
      return parseAnalysis(result.stdout);
    },
  };
}
