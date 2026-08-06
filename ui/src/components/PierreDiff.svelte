<script lang="ts">
  /**
   * Mounts Pierre SSR light-DOM HTML and wires review interactions:
   * findings flags, line comment (+), jump anchors, excerpt ranges.
   *
   * Pierre CSS expects CSS variables on `.pierre-host` (rewritten from
   * `:host`). Excerpts must *remove* out-of-range rows and fix
   * `grid-row: span N` — `display:none` leaves empty subgrid tracks and
   * blows the layout apart.
   */
  import { onMount } from "svelte";
  import type { PayloadFile, PayloadHunk, PayloadLine } from "../../../src/payload.ts";
  import {
    findingAnchorId,
    findingsForLine,
    getReviewState,
    type FindingEntry,
  } from "../state.svelte.ts";
  import "../pierre.css";

  interface Props {
    /** Pierre SSR body HTML (no shared CSS). */
    html: string;
    file: PayloadFile;
    /** When set, line/finding lookups use this hunk only. */
    hunk?: PayloadHunk | null;
    /** Optional line-number window (new or old) for section excerpts. */
    range?: { from: number; to: number } | null;
    class?: string;
  }

  const { html, file, hunk = null, range = null, class: className = "" }: Props = $props();
  const review = getReviewState();

  let host: HTMLDivElement | undefined = $state();
  /** Last HTML we applied excerpt surgery to (avoid double-trim). */
  let excerptAppliedFor: string | null = null;

  function findPayloadLine(lineNo: number, side: "additions" | "deletions" | "context"): {
    line: PayloadLine;
    hunkId: string;
    idx: number;
  } | null {
    const search = (h: PayloadHunk) => {
      for (let i = 0; i < h.lines.length; i++) {
        const l = h.lines[i];
        if (side === "deletions" && l.oldNo === lineNo) return { line: l, hunkId: h.id, idx: i };
        if (side !== "deletions" && l.newNo === lineNo) return { line: l, hunkId: h.id, idx: i };
        if (side === "context" && (l.newNo === lineNo || l.oldNo === lineNo)) {
          return { line: l, hunkId: h.id, idx: i };
        }
      }
      return null;
    };
    if (hunk) return search(hunk);
    for (const h of file.hunks) {
      const hit = search(h);
      if (hit) return hit;
    }
    return null;
  }

  function sideFromType(type: string | null): "additions" | "deletions" | "context" {
    if (!type) return "context";
    if (type.includes("deletion")) return "deletions";
    if (type.includes("addition")) return "additions";
    return "context";
  }

  function openForLine(lineNo: number, side: "additions" | "deletions" | "context", rect: DOMRect) {
    const hit = findPayloadLine(lineNo, side);
    if (!hit) {
      review.openComposer(`${file.path}:${lineNo}`, "", {
        anchor: { left: rect.left + window.scrollX, top: rect.bottom + window.scrollY },
      });
      return;
    }
    review.openComposer(review.refForLine(hit.hunkId, hit.idx), hit.line.text, {
      anchor: { left: rect.left + window.scrollX, top: rect.bottom + window.scrollY },
      jump: { kind: "line", hunkId: hit.hunkId, idx: hit.idx },
    });
  }

  function flagsForPayloadLine(line: PayloadLine, hunkId: string): FindingEntry[] {
    const openBySlot = review.findingsIndex.get(hunkId);
    return findingsForLine(openBySlot, line);
  }

  function lineInRange(el: HTMLElement): boolean {
    if (!range) return true;
    const n = Number(el.getAttribute("data-line") ?? el.getAttribute("data-column-number") ?? "");
    const alt = Number(el.getAttribute("data-alt-line") ?? "");
    return (
      (Number.isFinite(n) && n >= range.from && n <= range.to) ||
      (Number.isFinite(alt) && alt >= range.from && alt <= range.to)
    );
  }

  /** Rows a direct child contributes to Pierre's subgrid (buffers use data-buffer-size). */
  function childRowSpan(el: Element): number {
    if (
      el.hasAttribute("data-gutter-buffer") ||
      el.hasAttribute("data-content-buffer")
    ) {
      const n = Number(el.getAttribute("data-buffer-size") || "1");
      return Number.isFinite(n) && n > 0 ? n : 1;
    }
    if (
      el.hasAttribute("data-line") ||
      el.hasAttribute("data-column-number") ||
      el.hasAttribute("data-separator") ||
      el.hasAttribute("data-no-newline")
    ) {
      return 1;
    }
    return 0;
  }

  /**
   * Remove out-of-range rows and shrink `grid-row: span N` so subgrid tracks
   * match remaining lines. Hiding with display:none leaves empty tracks.
   * Split mode: gutters/content on both sides must share the same span, and
   * buffers (unequal add/del counts) count by data-buffer-size, not as 1.
   */
  function applyExcerpt() {
    if (!host || !range) return;
    const key = `${html}::${range.from}-${range.to}`;
    if (excerptAppliedFor === key) return;
    excerptAppliedFor = key;

    // Drop line cells outside the window (gutter numbers + content rows).
    // Prefer data-line-index so split left/right pairs stay in lockstep when
    // either side's line number falls in range.
    const keepIndex = new Set<string>();
    for (const el of host.querySelectorAll<HTMLElement>("[data-line], [data-column-number]")) {
      if (lineInRange(el)) {
        const idx = el.getAttribute("data-line-index");
        if (idx) keepIndex.add(idx);
      }
    }
    for (const el of [...host.querySelectorAll<HTMLElement>("[data-line], [data-column-number]")]) {
      const idx = el.getAttribute("data-line-index");
      if (idx && keepIndex.has(idx)) continue;
      if (!idx && lineInRange(el)) continue;
      el.remove();
    }

    // Resize equalizing buffers: remaining lines on each side may differ.
    // Drop buffers when both sides already match; otherwise leave Pierre's.
    // (We only rewrite the parent span below.)

    // Count remaining rows per [data-content] / [data-gutter] and rewrite span.
    let maxSpan = 1;
    const cols = [...host.querySelectorAll<HTMLElement>("[data-gutter], [data-content]")];
    const spans = cols.map((col) => {
      let span = 0;
      for (const kid of col.children) span += childRowSpan(kid);
      return Math.max(span, 1);
    });
    maxSpan = Math.max(1, ...spans);

    // Split: force both sides to the same span so subgrid tracks align.
    const isSplit = !!host.querySelector('[data-diff-type="split"]');
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i]!;
      const span = isSplit ? maxSpan : spans[i]!;
      col.style.gridRow = `span ${span}`;
      const styleAttr = col.getAttribute("style");
      if (styleAttr && /grid-row\s*:\s*span\s+\d+/i.test(styleAttr)) {
        col.setAttribute(
          "style",
          styleAttr.replace(/grid-row\s*:\s*span\s+\d+/gi, `grid-row: span ${span}`),
        );
      }
    }
  }

  function wireInteractions() {
    if (!host) return;

    // Clear prior injects
    host.querySelectorAll(".pd-comment, .pd-flag, .flag-anchor").forEach((n) => n.remove());
    host.querySelectorAll("[data-line].flagged").forEach((n) => n.classList.remove("flagged"));

    applyExcerpt();

    // Finding flags + data-hunk anchors for jumps
    const contentLines = host.querySelectorAll<HTMLElement>("[data-content] [data-line]");
    for (const el of contentLines) {
      const lineNo = Number(el.getAttribute("data-line"));
      if (!Number.isFinite(lineNo)) continue;
      const side = sideFromType(el.getAttribute("data-line-type"));
      const hit = findPayloadLine(lineNo, side);
      if (!hit) continue;

      el.dataset.hunk = hit.hunkId;
      el.dataset.idx = String(hit.idx);

      const flags = flagsForPayloadLine(hit.line, hit.hunkId);
      if (flags.length === 0) continue;
      el.classList.add("flagged");
      const anchor = document.createElement("span");
      anchor.className = "flag-anchor";
      anchor.dataset.findingAnchor = findingAnchorId(flags[0].finding);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pd-flag";
      btn.title = flags.map((f) => f.finding.title).join("\n");
      btn.textContent = flags.length > 1 ? String(flags.length) : "!";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const key = flags[0].key;
        review.openFinding = review.openFinding === key ? null : key;
      });
      anchor.appendChild(btn);
      const gutter = host.querySelector<HTMLElement>(
        `[data-gutter] [data-line-index="${el.getAttribute("data-line-index")}"]`,
      );
      if (gutter) {
        gutter.style.position = "relative";
        gutter.appendChild(anchor);
      } else {
        el.style.position = "relative";
        el.appendChild(anchor);
      }
    }

    // Comment buttons on gutter numbers
    const gutters = host.querySelectorAll<HTMLElement>("[data-gutter] [data-column-number]");
    for (const g of gutters) {
      if (g.querySelector(".pd-flag")) continue;
      g.style.position = "relative";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pd-comment";
      btn.title = "Comment on this line";
      btn.textContent = "+";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const lineNo = Number(
          g.getAttribute("data-column-number") ||
            g.querySelector("[data-line-number-content]")?.textContent,
        );
        if (!Number.isFinite(lineNo)) return;
        openForLine(lineNo, sideFromType(g.getAttribute("data-line-type")), g.getBoundingClientRect());
      });
      g.appendChild(btn);
    }
  }

  onMount(() => {
    wireInteractions();
  });

  $effect(() => {
    void review.findingsIndex;
    void review.diffMode;
    void html;
    void range;
    // New HTML → allow excerpt surgery again
    if (html) excerptAppliedFor = null;
    if (!host) return;
    queueMicrotask(() => wireInteractions());
  });
</script>

<div
  class="pierre-host {className}"
  class:excerpt={!!range}
  data-path={file.path}
  data-hunk={hunk?.id ?? ""}
  bind:this={host}
>
  {@html html}
</div>
