#!/usr/bin/env bun
// Scores backend/model/effort combinations on the fixture diffs in evals/cases/.
// The checks are structural — does the analysis reference real hunks, stay brief,
// only draw sensible diagrams — so runs are comparable across models and prompts.
//
//   bun evals/run.ts                        # default backend, all cases
//   bun evals/run.ts --model claude-sonnet-5 --effort medium
//   bun evals/run.ts --with anthropic,codex evals/cases/tiered-report.diff

import { resolveBackends, type AnalyzeOpts } from "../src/backends.ts";
import { diffForModel, parseDiff } from "../src/diff.ts";
import { buildReviewPayload } from "../src/payload.ts";
import { loadUiAssets, renderShell } from "../src/shell.ts";
import { scoreAnalysis, type Check } from "./score.ts";

// -- arg parsing (mirrors src/cli.ts flags) ----------------------------------

const args = process.argv.slice(2);
let withBackends: string[] | null = null;
const opts: AnalyzeOpts = {};
const caseFiles: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--with") withBackends = args[++i].split(",");
  else if (args[i] === "--model") opts.model = args[++i];
  else if (args[i] === "--effort") opts.effort = args[++i] as AnalyzeOpts["effort"];
  else caseFiles.push(args[i]);
}
if (caseFiles.length === 0) {
  const glob = new Bun.Glob("evals/cases/*.diff");
  for await (const f of glob.scan(import.meta.dir + "/..")) caseFiles.push(f);
  caseFiles.sort();
}

const backends = await resolveBackends(withBackends);
const label = [opts.model, opts.effort].filter(Boolean).join(" / ") || "defaults";

let anyFail = false;

for (const caseFile of caseFiles) {
  const files = parseDiff(await Bun.file(caseFile).text());
  const annotated = diffForModel(files);

  for (const backend of backends) {
    const started = Date.now();
    let checks: Check[] = [];
    let error = "";
    let outFile = "";
    try {
      const analysis = await backend.analyze(annotated, opts);
      checks = scoreAnalysis(analysis, files);
      if (checks.some((c) => !c.pass)) anyFail = true;

      // Artifacts are best-effort — missing UI build must not erase scores.
      const caseName = caseFile.split("/").pop()!.replace(/\.diff$/, "");
      const modelSlug = opts.model ? `-${opts.model.replace(/[^\w.-]+/g, "-")}` : "";
      outFile = `evals/out/${caseName}.${backend.name}${modelSlug}`;
      try {
        await Bun.write(`${outFile}.json`, JSON.stringify(analysis, null, 2));
        const payload = await buildReviewPayload([{ backend: backend.name, analysis }], files, "export");
        await Bun.write(`${outFile}.html`, renderShell(payload, await loadUiAssets()));
      } catch (writeErr) {
        const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
        console.log(`  ⚠ could not write HTML report: ${msg.slice(0, 160)}`);
        outFile = "";
      }
    } catch (e) {
      anyFail = true;
      error = e instanceof Error ? e.message : String(e);
    }
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    const passed = checks.filter((c) => c.pass).length;

    console.log(`\n${caseFile} · ${backend.name} (${label}) · ${secs}s · ${passed}/${checks.length}`);
    if (error) console.log(`  ✗ failed: ${error.slice(0, 200)}`);
    if (outFile) console.log(`  → ${outFile}.html`);
    for (const c of checks) console.log(`  ${c.pass ? "✓" : "✗"} ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
  }
}

if (anyFail) process.exit(1);
