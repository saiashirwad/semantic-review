import { getContext, setContext, tick } from "svelte";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import type { Finding } from "../../src/analysis.ts";
import type { PayloadFile, PayloadHunk, PayloadLine, ReviewPayload } from "../../src/payload.ts";
import { formatReview, type ReviewComment, type ReviewResult } from "../../src/review.ts";

export const SEVERITY_ORDER = ["critical", "major", "minor", "info"] as const;

export type FindingStatus = "resolved" | "sent";

/** Where to scroll when the reviewer re-opens a comment from the rail. */
export type CommentJump =
  | { kind: "line"; hunkId: string; idx: number }
  | { kind: "ctx"; ctx: string };

export interface PendingComment {
  ref: string;
  quote: string;
  anchor?: { left: number; top: number }; // document coords near the source line
  /** Client-only; used to jump back to source. Not POSTed. */
  jump?: CommentJump;
}

/** Client comment: ReviewComment plus jump field (never POSTed). */
export type UiComment = ReviewComment & { jump?: CommentJump };

export interface HunkRef {
  file: PayloadFile;
  hunk: PayloadHunk;
}

export type FindingEntry = { finding: Finding; key: string };

/** Map key for a line within a hunk: "hunk" or the signed line number string. */
export function lineSlot(line: number | null): string {
  return line == null ? "hunk" : String(line);
}

/** DOM anchor id for a finding location (shared by stacked findings on one line). */
export function findingAnchorId(finding: Finding): string {
  return `${finding.hunk_id}:${lineSlot(finding.line)}`;
}

/**
 * Open findings on a payload line, using the inverted index (newNo and/or -oldNo).
 * Positive model lines are new-file; negative are deleted old-file lines.
 */
export function findingsForLine(
  bySlot: Map<string, FindingEntry[]> | undefined,
  line: PayloadLine | undefined,
): FindingEntry[] {
  if (!bySlot || !line) return [];
  const hits: FindingEntry[] = [];
  if (line.newNo != null) hits.push(...(bySlot.get(String(line.newNo)) ?? []));
  if (line.oldNo != null) hits.push(...(bySlot.get(String(-line.oldNo)) ?? []));
  return hits;
}

export function clampLeftWidth(px: number): number {
  return Math.round(Math.min(ReviewState.LEFT_W_MAX, Math.max(ReviewState.LEFT_W_MIN, px)));
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

  /** Viewport is below the Wide 3-col floor (see App.svelte / ProgressHeader). */
  narrow = $state(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1119px)").matches : false,
  );
  /**
   * Three markable surfaces (header chips):
   * - Walk: narrative TOC (left)
   * - Diff: file checklist to mark viewed (left, XOR walk)
   * - Review: findings + comments (right)
   */
  walkOpen = $state(false);
  /** File checklist panel — separate from walk (not a walk step). */
  diffOpen = $state(false);
  reviewOpen = $state(
    typeof window !== "undefined" ? !window.matchMedia("(max-width: 1119px)").matches : true,
  );

  /** Wide layout: left rail width (Walk / Files). Drag-resizable. */
  leftWidth = $state(280);

  static readonly LEFT_W_MIN = 200;
  static readonly LEFT_W_MAX = 520;
  static readonly LEFT_W_DEFAULT = 280;

  constructor(payload: ReviewPayload) {
    this.payload = payload;
    this.hunkIndex = new Map();
    for (const file of payload.files) {
      for (const hunk of file.hunks) this.hunkIndex.set(hunk.id, { file, hunk });
    }
    if (this.narrow) {
      this.walkOpen = false;
      this.diffOpen = false;
      this.reviewOpen = false;
    }
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem("semantic-review:left-width");
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n)) this.leftWidth = clampLeftWidth(n);
    }
  }

  setLeftWidth(px: number) {
    this.leftWidth = clampLeftWidth(px);
    try {
      window.localStorage.setItem("semantic-review:left-width", String(this.leftWidth));
    } catch {
      /* private mode / SSR */
    }
  }

  /** Left dock shows Walk or Diff (not both). */
  get leftOpen() {
    return this.walkOpen || this.diffOpen;
  }

  /** Overlay drawer + scrim active (narrow only). */
  get drawerOpen() {
    return this.narrow && (this.walkOpen || this.diffOpen || this.reviewOpen);
  }

  toggleWalk() {
    if (this.narrow) {
      if (this.walkOpen) {
        this.walkOpen = false;
        return;
      }
      this.walkOpen = true;
      this.diffOpen = false;
      this.reviewOpen = false;
      return;
    }
    // Wide: Walk XOR Diff on the left track
    if (this.walkOpen) {
      this.walkOpen = false;
      return;
    }
    this.walkOpen = true;
    this.diffOpen = false;
  }

  toggleDiff() {
    if (this.narrow) {
      if (this.diffOpen) {
        this.diffOpen = false;
        return;
      }
      this.diffOpen = true;
      this.walkOpen = false;
      this.reviewOpen = false;
      return;
    }
    if (this.diffOpen) {
      this.diffOpen = false;
      return;
    }
    this.diffOpen = true;
    this.walkOpen = false;
  }

  toggleReview() {
    if (this.narrow) {
      if (this.reviewOpen) {
        this.reviewOpen = false;
        return;
      }
      this.reviewOpen = true;
      this.walkOpen = false;
      this.diffOpen = false;
      return;
    }
    this.reviewOpen = !this.reviewOpen;
  }

  closeDrawers() {
    if (!this.narrow) return;
    this.walkOpen = false;
    this.diffOpen = false;
    this.reviewOpen = false;
  }

  tuckWalk() {
    this.walkOpen = false;
  }

  tuckDiff() {
    this.diffOpen = false;
  }

  tuckReview() {
    this.reviewOpen = false;
  }

  /** Open Diff panel and scroll main to a file's full-diff details. */
  async jumpToFile(path: string) {
    this.closeDrawers();
    // On wide, surface the Diff checklist too so mark-viewed is one glance away.
    if (!this.narrow) {
      this.diffOpen = true;
      this.walkOpen = false;
    }
    await tick();
    const target = `Full diff: ${path}`;
    const details = [...document.querySelectorAll("details")].find(
      (d) => d.getAttribute("data-ctx") === target,
    ) as HTMLDetailsElement | undefined;
    if (details) details.open = true;
    (details ?? document.getElementById("full-diff"))?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  setNarrow(narrow: boolean) {
    if (narrow === this.narrow) return;
    this.narrow = narrow;
    if (narrow) {
      this.walkOpen = false;
      this.diffOpen = false;
      this.reviewOpen = false;
    } else {
      this.walkOpen = false;
      this.diffOpen = false;
      this.reviewOpen = true;
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
    const entry = this.hunkIndex.get(finding.hunk_id);
    let jump: CommentJump | undefined;
    if (entry) {
      const lineNo = finding.line;
      const idx =
        lineNo == null
          ? 0
          : entry.hunk.lines.findIndex((l) => (lineNo < 0 ? l.oldNo === -lineNo : l.newNo === lineNo));
      if (idx >= 0) jump = { kind: "line", hunkId: finding.hunk_id, idx };
    }
    this.comments.push({
      ref: this.refForFinding(finding),
      quote: this.quoteForFinding(finding) || undefined,
      text,
      backend: this.result.backend,
      jump,
    });
    this.findingStatus.set(key, "sent");
    if (this.openFinding === key) this.openFinding = null;
  }

  async jumpToFinding(key: string) {
    // On narrow, close overlay drawers so the line isn't covered.
    // On wide, keep docked rails — jump shouldn't tuck the review list.
    this.closeDrawers();
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
    const row = anchor.closest("tr") ?? anchor.closest("[data-line]") ?? anchor;
    row.scrollIntoView({ behavior: "instant", block: "center" });
  }

  /** Scroll the main column to a saved comment's source (line or section). */
  async jumpToComment(comment: UiComment) {
    this.closeDrawers();
    await tick();

    let target: Element | null = null;
    if (comment.jump?.kind === "line") {
      const { hunkId, idx } = comment.jump;
      target =
        document.querySelector(`[data-hunk="${CSS.escape(hunkId)}"][data-idx="${idx}"]`) ??
        document.querySelector(`td[data-hunk="${CSS.escape(hunkId)}"][data-idx="${idx}"]`);
    } else if (comment.jump?.kind === "ctx") {
      target = document.querySelector(`[data-ctx="${CSS.escape(comment.jump.ctx)}"]`);
    } else {
      // Fallback for older in-session comments: path:line or § heading
      target = this.resolveRefTarget(comment.ref);
    }
    if (!target) return;

    const details = target.closest("details");
    if (details) details.open = true;
    const row = target.closest("tr") ?? target.closest("[data-line]") ?? target;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.add("jump-flash");
    window.setTimeout(() => row.classList.remove("jump-flash"), 900);
  }

  /** Best-effort DOM target from a display ref string. */
  private resolveRefTarget(ref: string): Element | null {
    if (ref.startsWith("§ ")) {
      const ctx = ref.slice(2);
      return document.querySelector(`[data-ctx="${CSS.escape(ctx)}"]`);
    }
    // path:line or path:line (old)
    const m = ref.match(/^(.+):(\d+)(?:\s*\(old\))?$/);
    if (!m) return null;
    const path = m[1];
    const lineNo = Number(m[2]);
    const old = ref.includes("(old)");
    for (const file of this.payload.files) {
      if (file.path !== path) continue;
      for (const hunk of file.hunks) {
        for (let idx = 0; idx < hunk.lines.length; idx++) {
          const l = hunk.lines[idx];
          if (old ? l.oldNo === lineNo : l.newNo === lineNo) {
            return document.querySelector(
              `[data-hunk="${CSS.escape(hunk.id)}"][data-idx="${idx}"]`,
            );
          }
        }
      }
    }
    return null;
  }

  openComposer(
    ref: string,
    quote: string,
    opts: {
      anchor?: PendingComment["anchor"];
      jump?: CommentJump;
    } = {},
  ) {
    this.composer = { ref, quote, ...opts };
  }

  saveComment(text: string) {
    if (!this.composer || !text.trim()) return;
    this.comments.push({
      ref: this.composer.ref,
      quote: this.composer.quote || undefined,
      text: text.trim(),
      backend: this.result.backend,
      jump: this.composer.jump,
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
    // Drop client-only jump before leaving the browser.
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
