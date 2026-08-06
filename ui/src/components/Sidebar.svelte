<script lang="ts">
  import { getReviewState } from "../state.svelte";

  const review = getReviewState();

  // Files referenced by each section's snippets, deduplicated, in order.
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

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function findingCount(path: string): number {
    return review.sortedFindings.filter(({ finding, key }) => {
      if (review.resolvedFindings.has(key) || review.sentFindings.has(key)) return false;
      return review.hunkIndex.get(finding.hunk_id)?.file.path === path;
    }).length;
  }
</script>

<nav class="sidebar">
  <div class="label">Walkthrough</div>
  {#each review.analysis.sections as section, i}
    <div class="entry">
      <button class="heading" onclick={() => jump(`section-${i}`)}>
        <span class="num">{i + 1}</span>
        <span class="heading-text">{section.heading}</span>
      </button>
      {#if sectionFiles[i].length > 0}
        <ul>
          {#each sectionFiles[i] as path}
            <li class="file">
              <span class="path" title={path}>{path}</span>
              {#if findingCount(path) > 0}
                <span class="badge" title="Open findings in this file">{findingCount(path)}</span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/each}
  <div class="entry">
    <button class="heading" onclick={() => jump("full-diff")}>
      <span class="num">{review.analysis.sections.length + 1}</span>
      <span class="heading-text">Full diff</span>
    </button>
    <ul>
      {#each review.payload.files as file}
        <li class="file">
          <label title="Mark file as viewed">
            <input
              type="checkbox"
              checked={review.fileViewed(file)}
              onchange={(e) => review.setFileViewed(file, e.currentTarget.checked)}
            />
            <span class="path" class:struck={review.fileViewed(file)} title={file.path}>{file.path}</span>
          </label>
          <span class="counts"><b class="add">+{file.adds}</b> <b class="del">−{file.dels}</b></span>
        </li>
      {/each}
    </ul>
  </div>
</nav>

<style>
  nav {
    position: sticky;
    top: 48px;
    height: calc(100vh - 48px);
    overflow-y: auto;
    padding: 20px 12px 20px 20px;
  }

  .label {
    margin-bottom: 10px;
    color: var(--fg-faint);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .entry {
    margin-bottom: 16px;
  }

  .heading {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 4px 6px;
    margin-left: -6px;
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    font-size: 13px;
    font-weight: 500;
    text-align: left;
  }

  .heading:hover {
    background: var(--bg-hover);
  }

  .heading-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .num {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 5px;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 11px;
    font-weight: 600;
    line-height: 18px;
    text-align: center;
  }

  ul {
    margin: 2px 0 0;
    padding: 0 0 0 26px;
    list-style: none;
  }

  .file {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    color: var(--fg-muted);
    font: var(--font-mono);
    font-size: 11.5px;
  }

  .file label {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    cursor: pointer;
  }

  .file input {
    flex-shrink: 0;
    width: 13px;
    height: 13px;
    margin: 0;
    accent-color: var(--accent);
  }

  .path {
    overflow: hidden;
    direction: rtl;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .path.struck {
    color: var(--fg-faint);
    text-decoration: line-through;
  }

  .badge {
    flex-shrink: 0;
    min-width: 15px;
    padding: 0 4px;
    border-radius: 7px;
    background: color-mix(in srgb, var(--sev-major) 14%, transparent);
    color: var(--sev-major);
    font-size: 10px;
    font-weight: 600;
    line-height: 15px;
    text-align: center;
  }

  .counts {
    flex-shrink: 0;
    margin-left: auto;
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
  }

  .add {
    color: var(--add-fg);
    font-weight: 500;
  }

  .del {
    color: var(--del-fg);
    font-weight: 500;
  }
</style>
