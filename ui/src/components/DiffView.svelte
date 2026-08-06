<script lang="ts">
  import type { PayloadFile, PayloadHunk, PayloadLine } from "../../../src/payload";
  import { getReviewState } from "../state.svelte";
  import Check from "./Check.svelte";
  import FindingPopover from "./FindingPopover.svelte";

  interface Props {
    file: PayloadFile;
    hunk: PayloadHunk;
    range?: { from: number; to: number } | null;
    viewable?: boolean;
  }

  const { file, hunk, range = null, viewable = false }: Props = $props();
  const review = getReviewState();

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

{#snippet act(entry: { line: PayloadLine; idx: number } | null)}
  <td class="act">
    {#if entry}
      <button class="lc" title="Comment on this line" onclick={(e) => openComment(entry.line, e)}>+</button>
      {@render gutterFlag(entry.idx)}
    {/if}
  </td>
{/snippet}

{#snippet cell(entry: { line: PayloadLine; idx: number } | null, side: "left" | "right")}
  {#if entry}
    {@const { line, idx } = entry}
    <td class="g">{side === "right" ? (line.newNo ?? "") : (line.oldNo ?? line.newNo ?? "")}</td>
    <td class="m {line.kind}">{line.kind === "add" ? "+" : line.kind === "del" ? "−" : ""}</td>
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
    <td class="g"></td>
    <td class="m"></td>
    <td class="c spacer"></td>
  {/if}
{/snippet}

<div class="hunk" id="hunk-{hunk.id}">
  <div class="head">
    <span class="path">{file.path}</span>
    {#if elided}<span class="tag">excerpt</span>{/if}
    <span class="header">{hunk.header}</span>
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
    {#if viewable}
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
          {@const line = hunk.lines[idx]}
          <tr>
            {@render act({ line, idx })}
            <td class="g">{line.oldNo ?? ""}</td>
            {@render cell({ line, idx }, "right")}
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <table class="diff split">
      <tbody>
        {#each splitRows as row, i (i)}
          <tr>
            {@render act(row.left ?? row.right)}
            {@render cell(row.left, "left")}
            {@render cell(row.right, "right")}
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

  /* Keep flagged lines clear of the sticky header when scrolled into view */
  table.diff tr {
    scroll-margin-top: calc(var(--header-h) + 12px);
    scroll-margin-bottom: 12px;
  }

  table.split {
    table-layout: fixed;
  }

  td {
    padding: 0 8px;
    white-space: pre-wrap;
    word-break: break-all;
    vertical-align: top;
  }

  /* Leftmost gutter — comment + / finding flags, outside the code */
  .act {
    width: 28px;
    min-width: 28px;
    max-width: 28px;
    padding: 1px 2px;
    text-align: center;
    vertical-align: middle;
    background: #0a0a0a;
    border-right: 1px solid color-mix(in srgb, var(--fg-code) 12%, transparent);
    user-select: none;
    white-space: nowrap;
    word-break: normal;
  }

  .g {
    width: 1%;
    min-width: 36px;
    text-align: right;
    color: color-mix(in srgb, var(--fg-code) 35%, transparent);
    font-size: var(--fs-xs);
    font-variant-numeric: tabular-nums;
    user-select: none;
    white-space: nowrap;
    word-break: normal;
  }

  table.split .g {
    width: 40px;
  }

  .m {
    width: 1%;
    color: color-mix(in srgb, var(--fg-code) 35%, transparent);
    user-select: none;
    font-weight: 700;
  }

  .m.add {
    color: var(--add-fg);
  }

  .m.del {
    color: var(--del-fg);
  }

  .c {
    padding-left: 8px;
  }

  /* Keep shiki inline colors; only tint the row background */
  .c :global(span[style]) {
    background: transparent !important;
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

  table:not(.split) tr:has(.c.add) td:not(.act) {
    background: var(--add-row);
  }

  table:not(.split) tr:has(.c.del) td:not(.act) {
    background: var(--del-row);
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

  .lc {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: 1px solid var(--border);
    background: var(--accent);
    color: var(--accent-fg);
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
    opacity: 0;
  }

  tr:hover .lc {
    opacity: 1;
  }

  .lc:hover {
    background: var(--accent-hover);
  }

  .flag-anchor {
    position: relative;
    display: inline-block;
  }

  .act .flag-anchor {
    display: block;
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
