<script lang="ts">
  import type { PayloadFile, PayloadHunk } from "../../../src/payload.ts";
  import { findingAnchorId, findingsForLine, getReviewState } from "../state.svelte.ts";
  import Check from "./Check.svelte";
  import PierreDiff from "./PierreDiff.svelte";

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

  const showHunkViewed = $derived(viewable && (!embedded || file.hunks.length > 1));

  const pierreHtml = $derived(
    review.diffMode === "split"
      ? (hunk.pierre?.split || hunk.pierre?.unified || "")
      : (hunk.pierre?.unified || hunk.pierre?.split || ""),
  );
  const usePierre = $derived(pierreHtml.length > 0);

  // Legacy table path (fallback when Pierre SSR missing)
  let expanded = $state(false);
  const allIndices = $derived(hunk.lines.map((_, i) => i));
  const excerptIndices = $derived.by(() => {
    if (!range || expanded) return allIndices;
    const within = (n: number | null) => n != null && n >= range.from && n <= range.to;
    const sliced = allIndices.filter((i) => within(hunk.lines[i].newNo) || within(hunk.lines[i].oldNo));
    return sliced.length > 0 ? sliced : allIndices;
  });
  const elided = $derived(!usePierre && excerptIndices.length < hunk.lines.length);
  const hiddenAbove = $derived(elided ? excerptIndices[0] : 0);
  const hiddenBelow = $derived(elided ? hunk.lines.length - 1 - excerptIndices[excerptIndices.length - 1] : 0);

  interface SplitRow {
    left: { line: (typeof hunk.lines)[0]; idx: number } | null;
    right: { line: (typeof hunk.lines)[0]; idx: number } | null;
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

  function lineNo(line: (typeof hunk.lines)[0], side: "left" | "right" | "unified"): string | number {
    if (side === "left") return line.oldNo ?? "";
    if (side === "right") return line.newNo ?? "";
    if (line.kind === "del") return line.oldNo ?? "";
    return line.newNo ?? line.oldNo ?? "";
  }

  function sign(line: (typeof hunk.lines)[0]): string {
    return line.kind === "add" ? "+" : line.kind === "del" ? "−" : " ";
  }

  const openBySlot = $derived(review.findingsIndex.get(hunk.id));
  const hunkFlags = $derived(openBySlot?.get("hunk") ?? []);

  function flagsFor(idx: number) {
    return findingsForLine(openBySlot, hunk.lines[idx]);
  }

  function openComment(line: (typeof hunk.lines)[0], idx: number, e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).closest("tr")!.getBoundingClientRect();
    review.openComposer(review.refForLine(hunk.id, idx), line.text, {
      anchor: { left: rect.left + window.scrollX, top: rect.bottom + window.scrollY },
      jump: { kind: "line", hunkId: hunk.id, idx },
    });
  }

  function anchorForFlags(flags: ReturnType<typeof flagsFor>): string {
    return findingAnchorId(flags[0].finding);
  }

  function toggleFinding(key: string, e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    review.openFinding = review.openFinding === key ? null : key;
  }
</script>

{#snippet gutterFlag(idx: number)}
  {@const flags = flagsFor(idx)}
  {#if flags.length > 0}
    <span class="flag-anchor" data-finding-anchor={anchorForFlags(flags)}>
      <button
        type="button"
        class="flag"
        title={flags.map((f) => f.finding.title).join("\n")}
        onclick={(e) => toggleFinding(flags[0].key, e)}
      >
        {flags.length > 1 ? flags.length : "!"}
      </button>
    </span>
  {/if}
{/snippet}

{#snippet rowMeta(entry: { line: (typeof hunk.lines)[0]; idx: number } | null, side: "left" | "right" | "unified")}
  {#if entry}
    {@const { line, idx } = entry}
    <td class="gutter {line.kind}">
      <button class="lc" title="Comment on this line" onclick={(e) => openComment(line, idx, e)}>+</button>
      {@render gutterFlag(idx)}
      <span class="num">{lineNo(line, side)}</span>
      <span class="sign">{sign(line)}</span>
    </td>
    <td
      class="c {line.kind}"
      class:flagged={flagsFor(idx).length > 0}
      data-hunk={hunk.id}
      data-idx={idx}
    >
      {line.text || "\u00a0"}
    </td>
  {:else}
    <td class="gutter spacer"></td>
    <td class="c spacer"></td>
  {/if}
{/snippet}

<div
  class="hunk"
  class:embedded
  class:cursor={review.cursorHunk === hunk.id}
  id="hunk-{hunk.id}"
>
  <div class="head">
    {#if !embedded}
      <span class="path">{file.path}</span>
    {/if}
    {#if range}<span class="tag">excerpt</span>{/if}
    <span class="header" class:solo={embedded}>{hunk.header}</span>
    <span class="spacer-flex"></span>
    {#if hunkFlags.length > 0}
      <span class="flag-anchor" data-finding-anchor={anchorForFlags(hunkFlags)}>
        <button
          type="button"
          class="flag wide"
          title={hunkFlags.map((f) => f.finding.title).join("\n")}
          onclick={(e) => toggleFinding(hunkFlags[0].key, e)}
        >
          ! {hunkFlags.length}
        </button>
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
  {#if usePierre}
    <PierreDiff {file} {hunk} {range} html={pierreHtml} />
  {:else}
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
  {/if}
</div>

<style>
  .hunk {
    margin: 10px 0 14px;
    overflow: hidden;
    border: var(--border-w) solid var(--border);
    background: var(--bg-code);
    color: var(--fg-code);
    box-shadow: var(--shadow-card);
    font-family: var(--font-code);
  }

  .hunk.cursor {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .hunk.embedded {
    margin: 0;
    border: 0;
    border-top: 1px solid color-mix(in srgb, var(--fg-code) 12%, transparent);
    box-shadow: none;
  }

  .hunk.embedded.cursor {
    outline-offset: 0;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 28px;
    padding: 0 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--fg-code) 12%, transparent);
    background: #0c0c0c;
    font-family: var(--font-code);
    font-size: 12px;
  }

  .hunk.embedded .head {
    min-height: 26px;
    padding: 0 10px;
    background: #0c0c0c;
    border-bottom-color: color-mix(in srgb, var(--fg-code) 10%, transparent);
  }

  .path {
    color: var(--fg-code);
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .tag {
    padding: 0 5px;
    height: 16px;
    border: 0;
    background: var(--accent);
    color: var(--accent-fg);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    line-height: 16px;
    text-transform: uppercase;
  }

  .header {
    overflow: hidden;
    color: color-mix(in srgb, var(--fg-code) 42%, transparent);
    font-size: 11px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header.solo {
    color: color-mix(in srgb, var(--fg-code) 55%, transparent);
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

  .gutter {
    position: relative;
    width: 1%;
    padding: 0 1px 0 18px;
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

  .c :global(span[style]) {
    background: transparent !important;
  }

  .c::selection,
  .c :global(*)::selection {
    background: color-mix(in srgb, var(--accent) 36%, transparent) !important;
    color: inherit !important;
  }

  .c.add {
    background: color-mix(in srgb, var(--add-fg) 7%, #0c0c0c);
  }

  .c.del {
    background: color-mix(in srgb, var(--del-fg) 8%, #0c0c0c);
  }

  .c.flagged {
    box-shadow: inset 3px 0 0 var(--sev-major);
  }

  .c.spacer {
    background: #0a0a0a;
  }

  table:not(.split) tr:has(.c.add) .gutter,
  table:not(.split) tr:has(.c.add) .c {
    background: color-mix(in srgb, var(--add-fg) 7%, #0c0c0c);
  }

  table:not(.split) tr:has(.c.del) .gutter,
  table:not(.split) tr:has(.c.del) .c {
    background: color-mix(in srgb, var(--del-fg) 8%, #0c0c0c);
  }

  table:not(.split) tr:has(.c.add) .gutter {
    background: color-mix(in srgb, var(--add-fg) 7%, #0c0c0c);
  }

  table:not(.split) tr:has(.c.del) .gutter {
    background: color-mix(in srgb, var(--del-fg) 8%, #0c0c0c);
  }

  tr:hover .c:not(.spacer) {
    background: #161616;
  }

  tr:hover .c.add {
    background: color-mix(in srgb, var(--add-fg) 12%, #161616);
  }

  tr:hover .c.del {
    background: color-mix(in srgb, var(--del-fg) 12%, #161616);
  }

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
