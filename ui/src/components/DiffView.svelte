<script lang="ts">
  import type { PayloadFile, PayloadHunk, PayloadLine } from "../../../src/payload";
  import { getReviewState } from "../state.svelte";
  import FindingPopover from "./FindingPopover.svelte";

  interface Props {
    file: PayloadFile;
    hunk: PayloadHunk;
    range?: { from: number; to: number } | null;
    viewable?: boolean; // show the "Viewed" checkbox
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

  // Split view: zip consecutive del-run + add-run into left/right pairs.
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

{#snippet cell(entry: { line: PayloadLine; idx: number } | null, side: "left" | "right" | "both")}
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
      <button
        class="lc"
        title="Comment on this line"
        onclick={(e) => {
          const rect = e.currentTarget.closest("tr")!.getBoundingClientRect();
          review.openComposer(refFor(line), line.text, {
            html: line.html,
            anchor: { left: rect.left + window.scrollX, top: rect.bottom + window.scrollY },
          });
        }}
      >
        +
      </button>
      {@render gutterFlag(idx)}
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
      <label class="viewed">
        <input type="checkbox" checked={review.viewedHunks.has(hunk.id)} onchange={() => review.toggleViewed(hunk.id)} />
        Viewed
      </label>
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
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
  }

  .head {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 32px;
    padding: 0 12px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-inset);
    font: var(--font-mono);
    font-size: 11.5px;
  }

  .path {
    color: var(--fg);
    font-weight: 600;
  }

  .tag {
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--accent-soft);
    color: var(--accent);
    font-family: var(--font-sans);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .header {
    overflow: hidden;
    color: var(--fg-faint);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .spacer-flex {
    flex: 1;
  }

  .viewed {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--fg-muted);
    font-family: var(--font-sans);
    font-size: 11.5px;
    white-space: nowrap;
    cursor: pointer;
  }

  .viewed input {
    width: 13px;
    height: 13px;
    margin: 0;
    accent-color: var(--accent);
  }

  .expand {
    display: block;
    width: 100%;
    padding: 3px 12px;
    border: 0;
    background: var(--accent-soft);
    color: var(--accent);
    font: var(--font-mono);
    font-size: 11px;
    text-align: left;
  }

  .expand:hover {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }

  table.diff {
    width: 100%;
    border-collapse: collapse;
    font: var(--font-mono);
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

  .g {
    width: 1%;
    min-width: 36px;
    text-align: right;
    color: var(--fg-faint);
    font-size: 11px;
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
    color: var(--fg-faint);
    user-select: none;
  }

  .m.add {
    color: var(--add-fg);
  }

  .m.del {
    color: var(--del-fg);
  }

  .c {
    position: relative;
    padding-left: 26px;
  }

  .c.add {
    background: var(--add-bg);
  }

  .c.del {
    background: var(--del-bg);
  }

  .c.flagged {
    box-shadow: inset 2px 0 0 var(--sev-major);
  }

  .c.spacer {
    background: var(--bg-inset);
  }

  table:not(.split) tr:has(.c.add) td {
    background: var(--add-bg);
  }

  table:not(.split) tr:has(.c.del) td {
    background: var(--del-bg);
  }

  tr:hover .c:not(.spacer) {
    background: var(--bg-hover);
  }

  tr:hover .c.add {
    background: color-mix(in srgb, var(--add-bg) 70%, var(--bg-hover));
  }

  tr:hover .c.del {
    background: color-mix(in srgb, var(--del-bg) 70%, var(--bg-hover));
  }

  .lc {
    position: absolute;
    left: 3px;
    top: 2px;
    width: 16px;
    height: 16px;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: var(--accent);
    color: var(--accent-fg);
    font-size: 12px;
    font-weight: 600;
    line-height: 16px;
    text-align: center;
    opacity: 0;
    transition: opacity 0.08s;
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

  .flag {
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border: 0;
    border-radius: 4px;
    background: color-mix(in srgb, var(--sev-major) 14%, transparent);
    color: var(--sev-major);
    font-size: 10.5px;
    font-weight: 700;
    line-height: 16px;
  }

  .flag:hover {
    background: color-mix(in srgb, var(--sev-major) 24%, transparent);
  }

  .flag.wide {
    font-family: var(--font-sans);
  }
</style>
