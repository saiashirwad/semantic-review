<script lang="ts">
  import { onMount } from "svelte";
  import type { PayloadFile } from "../../../src/payload.ts";
  import { getReviewState } from "../state.svelte.ts";
  import Check from "./Check.svelte";
  import FilePath from "./FilePath.svelte";

  const review = getReviewState();

  let activeId = $state("section-0");

  const sectionFiles = $derived(
    review.analysis.sections.map((section) => {
      const paths: string[] = [];
      for (const snippet of section.snippets) {
        const entry = review.hunkIndex.get(snippet.hunk_id);
        if (entry && !paths.includes(entry.file.path)) paths.push(entry.file.path);
      }
      return paths;
    }),
  );

  const fullDiffId = "full-diff";
  const fullDiffNum = $derived(review.analysis.sections.length + 1);
  const fileCount = $derived(review.payload.files.length);
  const viewedCount = $derived(review.viewedFileCount);

  function sectionHunkIds(sectionIndex: number): Set<string> {
    return new Set(review.analysis.sections[sectionIndex]?.snippets.map((s) => s.hunk_id) ?? []);
  }

  function jump(id: string) {
    activeId = id;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function jumpToFile(file: PayloadFile) {
    activeId = fullDiffId;
    const target = `Full diff: ${file.path}`;
    const details = [...document.querySelectorAll("details")].find(
      (d) => d.getAttribute("data-ctx") === target,
    ) as HTMLDetailsElement | undefined;
    if (details) details.open = true;
    (details ?? document.getElementById(fullDiffId))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function jumpFirstFinding(sectionIndex: number, path: string) {
    const hit = review.openFindingsFor(path, sectionHunkIds(sectionIndex))[0];
    if (hit) void review.jumpToFinding(hit.key);
  }

  onMount(() => {
    const ids = [...review.analysis.sections.map((_, i) => `section-${i}`), fullDiffId];
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    // Track intersection state across callbacks so active step stays accurate.
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let bestId = "";
        let bestRatio = 0;
        for (const id of ids) {
          const ratio = visible.get(id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId) activeId = bestId;
      },
      { rootMargin: "-12% 0px -50% 0px", threshold: [0, 0.15, 0.35, 0.55, 0.75] },
    );
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  });
</script>

<nav class="sidebar" aria-label="Walkthrough">
  <header class="head">
    <span class="label">Walkthrough</span>
    <span class="progress" title="Files marked viewed">
      <b>{viewedCount}</b><span class="slash">/</span>{fileCount}
    </span>
  </header>

  <ol class="steps">
    {#each review.analysis.sections as section, i}
      {@const id = `section-${i}`}
      {@const active = activeId === id}
      <li class="step" class:active>
        <button type="button" class="step-btn" class:active aria-current={active ? "true" : undefined} onclick={() => jump(id)}>
          <span class="num" aria-hidden="true">{i + 1}</span>
          <span class="step-text">{section.heading}</span>
        </button>
        {#if sectionFiles[i].length > 0}
          {@const hunks = sectionHunkIds(i)}
          <ul class="meta">
            {#each sectionFiles[i] as path}
              {@const n = review.openFindingsFor(path, hunks).length}
              <li>
                <FilePath {path} class="meta-path" />
                {#if n > 0}
                  <button
                    type="button"
                    class="badge"
                    title="{n} open finding{n === 1 ? '' : 's'} — jump to first"
                    onclick={() => jumpFirstFinding(i, path)}
                  >
                    {n}
                  </button>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}

    <li class="step step-files" class:active={activeId === fullDiffId}>
      <button
        type="button"
        class="step-btn"
        class:active={activeId === fullDiffId}
        aria-current={activeId === fullDiffId ? "true" : undefined}
        onclick={() => jump(fullDiffId)}
      >
        <span class="num" aria-hidden="true">{fullDiffNum}</span>
        <span class="step-text">Full diff</span>
      </button>

      <ul class="checklist" aria-label="Files to review">
        {#each review.payload.files as file (file.path)}
          {@const viewed = review.fileViewed(file)}
          <li class="check-row" class:viewed>
            <Check
              checked={viewed}
              pad
              ariaLabel={viewed ? `Unmark ${file.path} as viewed` : `Mark ${file.path} as viewed`}
              onchange={() => review.setFileViewed(file, !viewed)}
            />
            <button type="button" class="file-jump" title={file.path} onclick={() => jumpToFile(file)}>
              <FilePath path={file.path} class="list-path" />
              <span class="counts">
                <b class="add">+{file.adds}</b>
                <b class="del">−{file.dels}</b>
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </li>
  </ol>
</nav>

<style>
  nav {
    position: sticky;
    top: var(--header-h);
    height: calc(100vh - var(--header-h));
    overflow-y: auto;
    padding: 18px 12px 24px 14px;
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 14px;
    padding: 0 4px;
  }

  .label {
    color: var(--fg-faint);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .progress {
    color: var(--fg-faint);
    font-family: var(--font-code);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .progress b {
    color: var(--fg);
    font-weight: 700;
  }

  .slash {
    margin: 0 1px;
    color: var(--fg-faint);
  }

  .steps {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .step {
    position: relative;
    margin: 0 0 4px;
    padding-bottom: 8px;
  }

  /* Vertical guide rail */
  .step:not(:last-child)::before {
    content: "";
    position: absolute;
    left: 15px;
    top: 28px;
    bottom: 0;
    width: 2px;
    background: color-mix(in srgb, var(--border) 18%, transparent);
  }

  .step-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 32px;
    padding: 5px 6px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--fg-muted);
    font-size: var(--fs-sm);
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: background 0.08s ease, color 0.08s ease;
  }

  .step-btn:hover {
    background: var(--bg-hover);
    color: var(--fg);
  }

  .step-btn.active {
    color: var(--fg);
  }

  .step-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
  }

  .num {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    color: var(--fg);
    font-family: var(--font-code);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    transition: background 0.08s ease, color 0.08s ease, box-shadow 0.08s ease;
  }

  .step-btn.active .num {
    background: var(--fg);
    color: var(--bg-raised);
    box-shadow: 2px 2px 0 var(--accent);
  }

  .step-btn:hover .num {
    box-shadow: 2px 2px 0 var(--border);
  }

  .step-btn.active:hover .num {
    box-shadow: 2px 2px 0 var(--accent);
  }

  /* Files under a narrative section */
  .meta {
    margin: 2px 0 0;
    padding: 0 6px 0 38px;
    list-style: none;
  }

  .meta li {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    min-height: 22px;
    padding: 1px 0;
  }

  .meta :global(.meta-path) {
    flex: 1;
    font-size: 11px;
  }

  .badge {
    flex-shrink: 0;
    align-self: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border: var(--border-w) solid var(--border);
    background: var(--accent);
    color: var(--accent-fg);
    font-family: var(--font-code);
    font-size: 10px;
    font-weight: 700;
    line-height: 14px;
    text-align: center;
    cursor: pointer;
  }

  .badge:hover {
    background: var(--accent-hover);
  }

  /* Full-diff checklist */
  .checklist {
    margin: 6px 0 0 28px;
    padding: 4px;
    list-style: none;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-card);
  }

  .check-row {
    display: flex;
    align-items: stretch;
    gap: 0;
  }

  .check-row + .check-row {
    border-top: 1px solid color-mix(in srgb, var(--border) 14%, transparent);
  }

  .check-row :global(.check.pad) {
    flex-shrink: 0;
    border-right: 1px solid color-mix(in srgb, var(--border) 14%, transparent);
    border-radius: 0;
  }

  .file-jump {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    min-height: 40px;
    padding: 6px 8px;
    border: 0;
    background: transparent;
    color: var(--fg);
    text-align: left;
    cursor: pointer;
  }

  .file-jump:hover {
    background: var(--bg-hover);
  }

  .file-jump :global(.list-path) {
    flex: 1;
    gap: 1px;
  }

  .file-jump :global(.list-path .base) {
    color: var(--fg);
    font-size: 12px;
  }

  .file-jump :global(.list-path .dir) {
    color: var(--fg-faint);
  }

  .check-row.viewed :global(.list-path .base) {
    color: var(--fg-faint);
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }

  .check-row.viewed :global(.list-path .dir) {
    color: color-mix(in srgb, var(--fg-faint) 55%, transparent);
  }

  .counts {
    flex-shrink: 0;
    align-self: center;
    display: inline-flex;
    gap: 4px;
    font-family: var(--font-code);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  .add {
    color: var(--selected);
  }

  .del {
    color: var(--sev-critical);
  }
</style>
