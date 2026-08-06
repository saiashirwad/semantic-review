import { run, type RunResult } from "./proc.ts";

type Runner = (argv: string[]) => Promise<RunResult>;

export async function getGitDiff(gitArgs: string[], execute: Runner = run): Promise<string> {
  const args = gitArgs.length > 0 ? gitArgs : ["HEAD"];
  const tracked = await execute(["git", "diff", "--no-color", ...args]);
  if (tracked.code !== 0) throw new Error(`git diff failed: ${tracked.stderr.trim()}`);
  if (gitArgs.length > 0) return tracked.stdout;

  const untracked = await execute(["git", "ls-files", "--others", "--exclude-standard", "-z"]);
  if (untracked.code !== 0) throw new Error(`git ls-files failed: ${untracked.stderr.trim()}`);

  const paths = untracked.stdout.split("\0").filter(Boolean);
  const added = await Promise.all(
    paths.map((path) => execute(["git", "diff", "--no-color", "--no-index", "--", "/dev/null", path])),
  );

  let diff = tracked.stdout;
  for (let i = 0; i < paths.length; i++) {
    const result = added[i];
    // git diff --no-index exits 1 when files differ (expected for new files).
    if (result.code !== 0 && result.code !== 1) {
      throw new Error(`git diff failed for untracked file ${paths[i]}: ${result.stderr.trim()}`);
    }
    diff += result.stdout;
  }
  return diff;
}
