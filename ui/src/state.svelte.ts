import { getContext, setContext, tick } from "svelte";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import type { Finding } from "../../src/analysis.ts";
import type { PayloadFile, PayloadHunk, PayloadLine, ReviewPayload } from "../../src/payload.ts";
import { formatReview, type ReviewComment, type ReviewResult } from "../../src/review.ts";

export const SEVERITY_ORDER = ["critical", "major", "minor", "info"] as const;

export type FindingStatus = "resolved" | "sent";

export interface PendingComment {
  ref: string;
  quote: string;
  html?: string; // shiki-highlighted quote, one hunk line per \n
  anchor?: { left: number; top: number }; // document coords near the source line
}

/** Client comment: ReviewComment plus optional display HTML (never POSTed). */
export type UiComment = ReviewComment & { html?: string };

export interface HunkRef {
  file: PayloadFile;
  hunk: PayloadHunk;
}

export type FindingEntry = { finding: Finding; key: string };

/** DOM anchor id for a finding location (shared by stacked findings on one line). */
export function findingAnchorId(finding: Finding): string {
  return finding.line == null ? `${finding.hunk_id}:hunk` : `${finding.hunk_id}:${finding.line}`;
}

/** Map key for a line within a hunk: "hunk" or the signed line number string. */
function lineSlot(line: number | null): string {
  return line == null ? "hunk" : String(line);
}

export class ReviewState {
  payload: ReviewPayload;
  hunkIndex: Map<string, HunkRef>;

  activeResult = $state(0);
  diffMode = $state<"unified" | "split">("unified");
  viewedHunks = new SvelteSet<string>();
  /** open = absent; resolved | sent = terminal disposition */
  findingStatus = new SvelteMap<string, FindingStatus>();
  comments = $state<UiComment[]>([]);
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

  setActiveResult(index: number) {
    if (index === this.activeResult) return;
    if (index < 0 || index >= this.payload.results.length) return;
    this.activeResult = index;
    this.openFinding = null;
    this.composer = null;
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
  get sortedFindings(): FindingEntry[] {
    return this.analysis.findings
      .map((finding, index) => ({ finding, key: this.findingKey(index) }))
      .sort((a, b) => SEVERITY_ORDER.indexOf(a.finding.severity) - SEVERITY_ORDER.indexOf(b.finding.severity));
  }

  /**
   * Inverted index: hunkId → lineSlot → open findings.
   * Rebuilt from active analysis + status (cheap at review scale).
   */
  get findingsIndex(): Map<string, Map<string, FindingEntry[]>> {
    const index = new Map<string, Map<string, FindingEntry[]>>();
    for (const entry of this.sortedFindings) {
      if (!this.isFindingOpen(entry.key)) continue;
      const slot = lineSlot(entry.finding.line);
      let bySlot = index.get(entry.finding.hunk_id);
      if (!bySlot) {
        bySlot = new Map();
        index.set(entry.finding.hunk_id, bySlot);
      }
      const list = bySlot.get(slot) ?? [];
      list.push(entry);
      bySlot.set(slot, list);
    }
    return index;
  }

  get openFindingCount() {
    return this.sortedFindings.filter(({ key }) => this.isFindingOpen(key)).length;
  }

  findingKey(index: number): string {
    return `${this.activeResult}:${index}`;
  }

  isFindingOpen(key: string): boolean {
    return !this.findingStatus.has(key);
  }

  findingDisposition(key: string): FindingStatus | null {
    return this.findingStatus.get(key) ?? null;
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
  // hunk when lineIdx is null).
  findingsAt(hunkId: string, lineIdx: number | null): FindingEntry[] {
    const bySlot = this.findingsIndex.get(hunkId);
    if (!bySlot) return [];
    if (lineIdx == null) return bySlot.get("hunk") ?? [];
    const line = this.hunkIndex.get(hunkId)?.hunk.lines[lineIdx];
    if (!line) return [];
    // Match model line encoding: positive = newNo, negative = -oldNo.
    const hits: FindingEntry[] = [];
    if (line.newNo != null) hits.push(...(bySlot.get(String(line.newNo)) ?? []));
    if (line.oldNo != null) {
      for (const h of bySlot.get(String(-line.oldNo)) ?? []) {
        if (!hits.some((x) => x.key === h.key)) hits.push(h);
      }
    }
    return hits;
  }

  /** Open findings whose hunk belongs to `path` and (optionally) is in `hunkIds`. */
  openFindingsFor(path: string, hunkIds?: Set<string>): FindingEntry[] {
    return this.sortedFindings.filter(({ finding, key }) => {
      if (!this.isFindingOpen(key)) return false;
      if (hunkIds && !hunkIds.has(finding.hunk_id)) return false;
      return this.hunkIndex.get(finding.hunk_id)?.file.path === path;
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
    const lineNo = finding.line;
    return entry.hunk.lines.find((l) => (lineNo < 0 ? l.oldNo === -lineNo : l.newNo === lineNo)) ?? null;
  }

  /** Resolve a payload line from DOM anchors (`data-hunk` + `data-idx`). */
  lineAt(hunkId: string, idx: number): PayloadLine | null {
    return this.hunkIndex.get(hunkId)?.hunk.lines[idx] ?? null;
  }

  refForLine(hunkId: string, idx: number): string {
    const entry = this.hunkIndex.get(hunkId);
    const line = entry?.hunk.lines[idx];
    if (!entry || !line) return "report";
    return line.newNo != null ? `${entry.file.path}:${line.newNo}` : `${entry.file.path}:${line.oldNo} (old)`;
  }

  resolveFinding(key: string) {
    this.findingStatus.set(key, "resolved");
    if (this.openFinding === key) this.openFinding = null;
  }

  reopenFinding(key: string) {
    this.findingStatus.delete(key);
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
      html: this.quoteHtmlForFinding(finding) || undefined,
      text,
      backend: this.result.backend,
    });
    this.findingStatus.set(key, "sent");
    if (this.openFinding === key) this.openFinding = null;
  }

  async jumpToFinding(key: string) {
    this.openFinding = key;
    await tick();
    const entry = this.sortedFindings.find((e) => e.key === key);
    if (!entry) return;
    const loc = findingAnchorId(entry.finding);
    const anchor = document.querySelector(`[data-finding-anchor="${CSS.escape(loc)}"]`);
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
      html: this.composer.html,
      text: text.trim(),
      backend: this.result.backend,
    });
    this.composer = null;
  }

  deleteComment(index: number) {
    this.comments.splice(index, 1);
  }

  buildResult(): ReviewResult {
    const notes = [...this.includeNotes]
      .sort((a, b) => a - b)
      .map((i) => ({ backend: this.payload.results[i].backend, items: this.payload.results[i].analysis.notes }))
      .filter((n) => n.items.length > 0);
    // Strip client-only `html` before leaving the browser.
    const comments: ReviewComment[] = this.comments.map(({ ref, quote, text, backend }) => ({
      ref,
      quote,
      text,
      backend,
    }));
    return { comments, overall: this.overall.trim(), notes };
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
