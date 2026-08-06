import { getContext, setContext, tick } from "svelte";
import { SvelteSet } from "svelte/reactivity";
import type { Finding } from "../../src/analysis";
import type { PayloadFile, PayloadHunk, ReviewPayload } from "../../src/payload";
import { formatReview, type ReviewComment, type ReviewResult } from "../../src/review";

export const SEVERITY_ORDER = ["critical", "major", "minor", "info"] as const;

export interface PendingComment {
  ref: string;
  quote: string;
  html?: string; // shiki-highlighted quote, one hunk line per \n
  anchor?: { left: number; top: number }; // document coords near the source line
}

export interface HunkRef {
  file: PayloadFile;
  hunk: PayloadHunk;
}

export class ReviewState {
  payload: ReviewPayload;
  hunkIndex: Map<string, HunkRef>;

  activeResult = $state(0);
  diffMode = $state<"unified" | "split">("unified");
  viewedHunks = new SvelteSet<string>();
  resolvedFindings = new SvelteSet<string>(); // keys `${resultIdx}:${findingIdx}`
  sentFindings = new SvelteSet<string>();
  comments = $state<ReviewComment[]>([]);
  // Client-side only: shiki HTML for each comment's quote, parallel to
  // `comments`. Never serialized into the ReviewResult.
  commentHtml = $state<(string | undefined)[]>([]);
  overall = $state("");
  includeNotes = new SvelteSet<number>(); // result indices
  openFinding = $state<string | null>(null);
  composer = $state<PendingComment | null>(null);
  finished = $state(false);
  copyError = $state("");

  constructor(payload: ReviewPayload) {
    this.payload = payload;
    this.hunkIndex = new Map();
    for (const file of payload.files) {
      for (const hunk of file.hunks) this.hunkIndex.set(hunk.id, { file, hunk });
    }
  }

  get result() {
    return this.payload.results[this.activeResult];
  }
  get analysis() {
    return this.result.analysis;
  }
  get multiTab() {
    return this.payload.results.length > 1;
  }

  // Getters (not $derived fields) because field initializers would run before
  // the constructor assigns payload; reads still track reactive state.
  get viewedFileCount() {
    return this.payload.files.filter((f) => f.hunks.length > 0 && f.hunks.every((h) => this.viewedHunks.has(h.id)))
      .length;
  }

  get linesLeft() {
    return this.payload.files.reduce(
      (n, f) =>
        n +
        f.hunks
          .filter((h) => !this.viewedHunks.has(h.id))
          .reduce((m, h) => m + h.lines.filter((l) => l.kind !== "context").length, 0),
      0,
    );
  }

  // Findings of the active result, sorted by severity, with stable keys.
  get sortedFindings() {
    return this.analysis.findings
      .map((finding, index) => ({ finding, key: `${this.activeResult}:${index}` }))
      .sort((a, b) => SEVERITY_ORDER.indexOf(a.finding.severity) - SEVERITY_ORDER.indexOf(b.finding.severity));
  }

  get openFindingCount() {
    return this.sortedFindings.filter(({ key }) => !this.resolvedFindings.has(key) && !this.sentFindings.has(key))
      .length;
  }

  toggleViewed(hunkId: string) {
    if (this.viewedHunks.has(hunkId)) this.viewedHunks.delete(hunkId);
    else this.viewedHunks.add(hunkId);
  }

  fileViewed(file: PayloadFile): boolean {
    return file.hunks.length > 0 && file.hunks.every((h) => this.viewedHunks.has(h.id));
  }

  setFileViewed(file: PayloadFile, viewed: boolean) {
    for (const h of file.hunks) {
      if (viewed) this.viewedHunks.add(h.id);
      else this.viewedHunks.delete(h.id);
    }
  }

  // Findings of the active result anchored to a given hunk line (or the whole
  // hunk when lineIdx is null), as [key, finding] pairs.
  findingsAt(hunkId: string, lineIdx: number | null): { finding: Finding; key: string }[] {
    const entry = this.hunkIndex.get(hunkId);
    if (!entry) return [];
    return this.analysis.findings
      .map((finding, index) => ({ finding, key: `${this.activeResult}:${index}` }))
      .filter(({ finding }) => {
        if (finding.hunk_id !== hunkId) return false;
        if (lineIdx == null) return finding.line == null;
        if (finding.line == null) return false;
        const line = entry.hunk.lines[lineIdx];
        return finding.line < 0 ? line.oldNo === -finding.line : line.newNo === finding.line;
      });
  }

  refForFinding(finding: Finding): string {
    const entry = this.hunkIndex.get(finding.hunk_id);
    if (!entry) return `finding (${finding.hunk_id})`;
    if (finding.line == null) return `${entry.file.path} (${entry.hunk.header})`;
    return finding.line < 0 ? `${entry.file.path}:${-finding.line} (old)` : `${entry.file.path}:${finding.line}`;
  }

  quoteForFinding(finding: Finding): string {
    return this.lineForFinding(finding)?.text ?? "";
  }

  quoteHtmlForFinding(finding: Finding): string {
    return this.lineForFinding(finding)?.html ?? "";
  }

  private lineForFinding(finding: Finding) {
    const entry = this.hunkIndex.get(finding.hunk_id);
    if (!entry || finding.line == null) return null;
    return (
      entry.hunk.lines.find((l) => (finding.line! < 0 ? l.oldNo === -finding.line! : l.newNo === finding.line)) ?? null
    );
  }

  resolveFinding(key: string) {
    this.resolvedFindings.add(key);
    if (this.openFinding === key) this.openFinding = null;
  }

  reopenFinding(key: string) {
    this.resolvedFindings.delete(key);
    this.sentFindings.delete(key);
  }

  // Converts a finding into a regular review comment so it flows through the
  // unchanged ReviewResult -> formatReview -> stdout contract.
  sendFinding(key: string, finding: Finding) {
    const text =
      `[finding — ${finding.severity}] ${finding.title}\n${finding.body}` +
      (finding.recommendation.trim() ? `\nRecommendation: ${finding.recommendation}` : "");
    this.comments.push({
      ref: this.refForFinding(finding),
      quote: this.quoteForFinding(finding) || undefined,
      text,
      backend: this.result.backend,
    });
    this.commentHtml.push(this.quoteHtmlForFinding(finding) || undefined);
    this.sentFindings.add(key);
    if (this.openFinding === key) this.openFinding = null;
  }

  async jumpToFinding(key: string) {
    this.openFinding = key;
    await tick();
    const anchor = document.querySelector(`[data-finding-line="${CSS.escape(key)}"]`);
    if (!anchor) return;
    const details = anchor.closest("details");
    if (details) details.open = true;
    // Center the line so the popover has room above or below; FindingPopover
    // places itself and respects the sticky header offset.
    const row = anchor.closest("tr") ?? anchor;
    row.scrollIntoView({ behavior: "instant", block: "center" });
  }

  openComposer(ref: string, quote: string, opts: { html?: string; anchor?: PendingComment["anchor"] } = {}) {
    this.composer = { ref, quote, ...opts };
  }

  saveComment(text: string) {
    if (!this.composer || !text.trim()) return;
    this.comments.push({
      ref: this.composer.ref,
      quote: this.composer.quote || undefined,
      text: text.trim(),
      backend: this.result.backend,
    });
    this.commentHtml.push(this.composer.html);
    this.composer = null;
  }

  deleteComment(index: number) {
    this.comments.splice(index, 1);
    this.commentHtml.splice(index, 1);
  }

  buildResult(): ReviewResult {
    const notes = [...this.includeNotes]
      .sort((a, b) => a - b)
      .map((i) => ({ backend: this.payload.results[i].backend, items: this.payload.results[i].analysis.notes }))
      .filter((n) => n.items.length > 0);
    return { comments: this.comments, overall: this.overall.trim(), notes };
  }

  async done() {
    const result = this.buildResult();
    if (this.payload.mode === "export") {
      const feedback = formatReview(result, this.multiTab);
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(feedback);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = feedback;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.append(textarea);
          textarea.select();
          const copied = document.execCommand("copy");
          textarea.remove();
          if (!copied) throw new Error("copy command failed");
        }
      } catch (error) {
        this.copyError = `Could not copy the review to your clipboard: ${(error as Error).message}`;
        return;
      }
    } else {
      await fetch("/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
    }
    this.finished = true;
  }
}

const KEY = Symbol("review-state");

export function provideReviewState(state: ReviewState) {
  setContext(KEY, state);
}

export function getReviewState(): ReviewState {
  return getContext<ReviewState>(KEY);
}
