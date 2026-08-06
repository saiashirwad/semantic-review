<script lang="ts">
  import type { PayloadFile, PayloadHunk, PayloadLine } from "../../../src/payload";
  import { getReviewState } from "../state.svelte";
  import Check from "./Check.svelte";
  import FindingPopover from "./FindingPopover.svelte";

  interface Props {
    file: PayloadFile;
    hunk: PayloadHunk;
    range?: { from: number; to: number } | null;
    /** Per-hunk “Viewed” control (full-diff progress). */
    viewable?: boolean;
    /** Nested under a file chrome (Full diff) — don’t repeat path / file Viewed. */
    embedded?: boolean;
  }

  const { file, hunk, range = null, viewable = false, embedded = false }: Props = $props();
  const review = getReviewState();

  // In Full diff the file row already has Viewed; only offer per-hunk checks
  // when a file is split across multiple hunks.
  const showHunkViewed = $derived(viewable && (!embedded || file.hunks.length > 1));

  let expanded = $state(false);

  const allIndices = $derived(hunk.lines.map((_, i) => i));

  const excerptIndices = $derived.by(() => {
    if (!range || expanded) return allIndices;
    const within = (n: number | null) => n != null && n >= range.from && n <= range.to;
    const sliced = allIndices.filter((i) => within(hunk.lines[i].newNo) || within(hunk.lines[i].oldNo));
    return sliced.length > 0 ? sliced : allIndices;
  });

  const elided = $derived(excerptIndices.length < hunk.lines.length);
  const hiddenAbove = $derived(elided ? excerptIndices[0] : 0);
  const hiddenBelow = $derived(elided ? hunk.lines.length - 1 - excerptIndices[excerptIndices.length - 1] : 0);

  interface SplitRow {
    left: { line: PayloadLine; idx: number } | null;
    right: { line: PayloadLine; idx: number } | null;
  }

  const splitRows = $derived.by(() => {
    const rows: SplitRow[] = [];
    const idxs = excerptIndices;
    let i = 0;
    while (i < idxs.length) {
      const line = hunk.lines[idxs[i]];
      if (line.kind === "context") {
        rows.push({ left: { line, idx: idxs[i] }, right: { line, idx: idxs[i] } });
        i++;
        continue;
      }
      const dels: number[] = [];
      const adds: number[] = [];
      while (i < idxs.length && hunk.lines[idxs[i]].kind === "del") dels.push(idxs[i++]);
      while (i < idxs.length && hunk.lines[idxs[i]].kind === "add") adds.push(idxs[i++]);
      for (let j = 0; j < Math.max(dels.length, adds.length); j++) {
        rows.push({
          left: j < dels.length ? { line: hunk.lines[dels[j]], idx: dels[j] } : null,
          right: j < adds.length ? { line: hunk.lines[adds[j]], idx: adds[j] } : null,
        });
      }
    }
    return rows;
  });

  function refFor(line: PayloadLine): string {
    return line.newNo != null ? `${file.path}:${line.newNo}` : `${file.path}:${line.oldNo} (old)`;
  }

  /** One number column: new line for adds/context, old line for dels. */
  function lineNo(line: PayloadLine, side: "left" | "right" | "unified"): string | number {
    if (side === "left") return line.oldNo ?? "";
    if (side === "right") return line.newNo ?? "";
    // unified
    if (line.kind === "del") return line.oldNo ?? "";
    return line.newNo ?? line.oldNo ?? "";
  }

  function sign(line: PayloadLine): string {
    return line.kind === "add" ? "+" : line.kind === "del" ? "−" : " ";
  }

  function flagsFor(idx: number) {
    return review.findingsAt(hunk.id, idx).filter(({ key }) => !review.resolvedFindings.has(key));
  }

  function openComment(line: PayloadLine, e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).closest("tr")!.getBoundingClientRect();
    review.openComposer(refFor(line), line.text, {
      html: line.html,
      anchor: { left: rect.left + window.scrollX, top: rect.bottom + window.scrollY },
    });
  }

  const hunkFlags = $derived(review.findingsAt(hunk.id, null).filter(({ key }) => !review.resolvedFindings.has(key)));
</script>

{#snippet gutterFlag(idx: number)}
  {@const flags = flagsFor(idx)}
  {#if flags.length > 0}
    <span class="flag-anchor" data-finding-line={flags[0].key}>
      <button
        class="flag"
        title={flags.map((f) => f.finding.title).join("\n")}
        onclick={() => (review.openFinding = review.openFinding === flags[0].key ? null : flags[0].key)}
      >
        !
      </button>
      {#each flags as { finding, key } (key)}
        {#if review.openFinding === key}
          <FindingPopover {finding} {key} />
        {/if}
      {/each}
    </span>
  {/if}
{/snippet}

{#snippet rowMeta(entry: { line: PayloadLine; idx: number } | null, side: "left" | "right" | "unified")}
  {#if entry}
    {@const { line, idx } = entry}
    <!-- Combined gutter: line number + sign; comment on hover -->
    <td class="gutter {line.kind}">
      <button class="lc" title="Comment on this line" onclick={(e) => openComment(line, e)}>+</button>
      {@render gutterFlag(idx)}
      <span class="num">{lineNo(line, side)}</span>
      <span class="sign">{sign(line)}</span>
    </td>
    <td
      class="c {line.kind}"
      class:flagged={flagsFor(idx).length > 0}
      data-ref={refFor(line)}
      data-html={line.html}
      data-text={line.text}
    >
      {@html line.html || "&nbsp;"}
    </td>
  {:else}
    <td class="gutter spacer"></td>
    <td class="c spacer"></td>
  {/if}
{/snippet}

<div class="hunk" class:embedded id="hunk-{hunk.id}">
  <div class="head">
    {#if !embedded}
      <span class="path">{file.path}</span>
    {/if}
    {#if elided}<span class="tag">excerpt</span>{/if}
    <span class="header" class:solo={embedded}>{hunk.header}</span>
    <span class="spacer-flex"></span>
    {#if hunkFlags.length > 0}
      <span class="flag-anchor" data-finding-line={hunkFlags[0].key}>
        <button
          class="flag wide"
          title={hunkFlags.map((f) => f.finding.title).join("\n")}
          onclick={() => (review.openFinding = review.openFinding === hunkFlags[0].key ? null : hunkFlags[0].key)}
        >
          ! {hunkFlags.length}
        </button>
        {#each hunkFlags as { finding, key } (key)}
          {#if review.openFinding === key}
            <FindingPopover {finding} {key} />
          {/if}
        {/each}
      </span>
    {/if}
    {#if showHunkViewed}
      <span class="viewed">
        <Check
          checked={review.viewedHunks.has(hunk.id)}
          label="Viewed"
          onchange={() => review.toggleViewed(hunk.id)}
        />
      </span>
    {/if}
  </div>
  {#if elided && hiddenAbove > 0}
    <button class="expand" onclick={() => (expanded = true)}>
      ↑ {hiddenAbove} more line{hiddenAbove === 1 ? "" : "s"}
    </button>
  {/if}
  {#if review.diffMode === "unified"}
    <table class="diff">
      <tbody>
        {#each excerptIndices as idx (idx)}
          <tr>
            {@render rowMeta({ line: hunk.lines[idx], idx }, "unified")}
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <table class="diff split">
      <tbody>
        {#each splitRows as row, i (i)}
          <tr>
            {@render rowMeta(row.left, "left")}
            {@render rowMeta(row.right, "right")}
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
  {#if elided && hiddenBelow > 0}
    <button class="expand" onclick={() => (expanded = true)}>
      ↓ {hiddenBelow} more line{hiddenBelow === 1 ? "" : "s"}
    </button>
  {/if}
</div>

<style>
  .hunk {
    margin: 12px 0;
    overflow: hidden;
    border: var(--border-w) solid var(--border);
    background: var(--bg-code);
    color: var(--fg-code);
    box-shadow: var(--shadow-card);
    font-family: var(--font-code);
  }

  /* Nested under Full diff file row — no second card shadow / path chrome */
  .hunk.embedded {
    margin: 0;
    border: 0;
    border-top: 1px solid color-mix(in srgb, var(--fg-code) 14%, transparent);
    box-shadow: none;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    padding: 6px 12px;
    border-bottom: var(--border-w) solid color-mix(in srgb, var(--fg-code) 18%, transparent);
    background: #0a0a0a;
    font-family: var(--font-code);
    font-size: var(--fs-sm);
  }

  .hunk.embedded .head {
    min-height: 28px;
    padding: 4px 12px;
    background: #0e0e0e;
    border-bottom-color: color-mix(in srgb, var(--fg-code) 10%, transparent);
  }

  .path {
    color: var(--fg-code);
    font-weight: 700;
  }

  .tag {
    padding: 1px 6px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--accent-fg);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .header {
    overflow: hidden;
    color: color-mix(in srgb, var(--fg-code) 50%, transparent);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header.solo {
    color: color-mix(in srgb, var(--fg-code) 62%, transparent);
    font-weight: 500;
  }

  .spacer-flex {
    flex: 1;
  }

  .viewed {
    display: flex;
    align-items: center;
  }

  .expand {
    display: block;
    width: 100%;
    padding: 5px 12px;
    border: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--fg-code) 12%, transparent);
    background: #1a1a1a;
    color: var(--add-fg);
    font-size: var(--fs-xs);
    font-weight: 600;
    text-align: left;
  }

  .expand:last-child {
    border-bottom: 0;
    border-top: 1px solid color-mix(in srgb, var(--fg-code) 12%, transparent);
  }

  .expand:hover {
    background: #222;
  }

  table.diff {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-code);
    font-size: var(--fs-sm);
    line-height: 1.55;
  }

  table.diff tr {
    scroll-margin-top: calc(var(--header-h) + 12px);
    scroll-margin-bottom: 12px;
  }

  table.split {
    table-layout: fixed;
  }

  td {
    padding: 0;
    white-space: pre-wrap;
    word-break: break-all;
    vertical-align: top;
  }

  /*
   * Single gutter column: [num][sign]
   * Comment button overlays on hover (no extra column).
   */
  .gutter {
    position: relative;
    width: 1%;
    padding: 0 1px 0 18px; /* room for hover + / flag on the left */
    border-right: 1px solid color-mix(in srgb, var(--fg-code) 10%, transparent);
    background: #0c0c0c;
    color: color-mix(in srgb, var(--fg-code) 38%, transparent);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    line-height: 1.55;
    user-select: none;
    white-space: nowrap;
    word-break: normal;
    vertical-align: top;
  }

  .gutter .num {
    display: inline-block;
    min-width: 1.75rem;
    padding: 0;
    text-align: right;
  }

  .gutter .sign {
    display: inline-block;
    width: 0.85rem;
    text-align: center;
    font-weight: 700;
  }

  .gutter.add .sign {
    color: var(--add-fg);
  }

  .gutter.del .sign {
    color: var(--del-fg);
  }

  .gutter.add {
    background: color-mix(in srgb, var(--add-row) 70%, #0c0c0c);
  }

  .gutter.del {
    background: color-mix(in srgb, var(--del-row) 70%, #0c0c0c);
  }

  .gutter.spacer {
    background: #0a0a0a;
  }

  .c {
    padding: 0 10px 0 8px;
  }

  /* Keep shiki token colors; only tint the row */
  .c :global(span[style]) {
    background: transparent !important;
  }

  /*
   * Selection must hit nested shiki <span>s. Solid accent (no alpha) —
   * transparent mixes silently fall back to system blue.
   * !important beats inline token color on the selected range.
   */
  .c::selection,
  .c :global(*)::selection {
    background: var(--selection-bg) !important;
    color: var(--selection-fg) !important;
  }

  .c::-moz-selection,
  .c :global(*)::-moz-selection {
    background: var(--selection-bg) !important;
    color: var(--selection-fg) !important;
  }

  .c.add {
    background: var(--add-row);
  }

  .c.del {
    background: var(--del-row);
  }

  .c.flagged {
    box-shadow: inset 3px 0 0 var(--sev-major);
  }

  .c.spacer {
    background: #0a0a0a;
  }

  table:not(.split) tr:has(.c.add) .gutter,
  table:not(.split) tr:has(.c.add) .c {
    background: var(--add-row);
  }

  table:not(.split) tr:has(.c.del) .gutter,
  table:not(.split) tr:has(.c.del) .c {
    background: var(--del-row);
  }

  table:not(.split) tr:has(.c.add) .gutter {
    background: color-mix(in srgb, var(--add-row) 85%, #0c0c0c);
  }

  table:not(.split) tr:has(.c.del) .gutter {
    background: color-mix(in srgb, var(--del-row) 85%, #0c0c0c);
  }

  tr:hover .c:not(.spacer) {
    background: #1a1a1a;
  }

  tr:hover .c.add {
    background: color-mix(in srgb, var(--add-row) 85%, #1a1a1a);
  }

  tr:hover .c.del {
    background: color-mix(in srgb, var(--del-row) 85%, #1a1a1a);
  }

  /* Comment: sits in the gutter, reveals on row hover */
  .lc {
    position: absolute;
    left: 1px;
    top: 50%;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    transform: translateY(-50%);
    border: 1px solid var(--border);
    background: var(--accent);
    color: var(--accent-fg);
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    opacity: 0;
    pointer-events: none;
  }

  tr:hover .lc {
    opacity: 1;
    pointer-events: auto;
  }

  .lc:hover {
    background: var(--accent-hover);
  }

  .flag-anchor {
    position: relative;
    display: inline-block;
  }

  .gutter .flag-anchor {
    position: absolute;
    left: 1px;
    top: 50%;
    z-index: 3;
    transform: translateY(-50%);
  }

  .gutter:has(.flag-anchor) .lc {
    display: none;
  }

  .flag {
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border: 1px solid var(--sev-major);
    background: var(--sev-major);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 14px;
  }

  .flag:hover {
    filter: brightness(1.1);
  }

  .flag.wide {
    font-size: 11px;
  }
</style>
