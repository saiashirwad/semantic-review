<script lang="ts">
  /**
   * Files panel — hierarchical tree with viewed checkboxes, jump, +/−, status.
   * Pure Svelte; hard neobrutalist chrome (no third-party tree widget).
   */
  import type { PayloadFile } from "../../../src/payload.ts";
  import { getReviewState } from "../state.svelte.ts";
  import Check from "./Check.svelte";

  const review = getReviewState();
  const fileCount = $derived(review.payload.files.length);
  const viewedCount = $derived(review.viewedFileCount);

  let query = $state("");
  /** Collapsed directory paths (everything else is open). */
  let collapsed = $state(new Set<string>());

  type DirNode = {
    kind: "dir";
    name: string;
    path: string;
    children: TreeNode[];
  };
  type FileNode = {
    kind: "file";
    name: string;
    file: PayloadFile;
  };
  type TreeNode = DirNode | FileNode;

  function insertFile(root: DirNode, file: PayloadFile) {
    const parts = file.path.split("/").filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i]!;
      const dirPath = parts.slice(0, i + 1).join("/");
      let child = node.children.find((c): c is DirNode => c.kind === "dir" && c.name === name);
      if (!child) {
        child = { kind: "dir", name, path: dirPath, children: [] };
        node.children.push(child);
      }
      node = child;
    }
    const name = parts[parts.length - 1] ?? file.path;
    node.children.push({ kind: "file", name, file });
  }

  function sortNode(node: DirNode) {
    node.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const c of node.children) {
      if (c.kind === "dir") sortNode(c);
    }
  }

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const files = review.payload.files;
    if (!q) return files;
    return files.filter((f) => f.path.toLowerCase().includes(q));
  });

  const tree = $derived.by(() => {
    const root: DirNode = { kind: "dir", name: "", path: "", children: [] };
    for (const file of filtered) insertFile(root, file);
    sortNode(root);
    return root;
  });

  /** Flat visible rows for rendering (respects collapse + filter). */
  type Row =
    | { kind: "dir"; name: string; path: string; depth: number; open: boolean }
    | { kind: "file"; name: string; file: PayloadFile; depth: number };

  const rows = $derived.by(() => {
    const out: Row[] = [];
    const filtering = query.trim().length > 0;

    function walk(nodes: TreeNode[], depth: number) {
      for (const n of nodes) {
        if (n.kind === "dir") {
          const open = filtering || !collapsed.has(n.path);
          out.push({ kind: "dir", name: n.name, path: n.path, depth, open });
          if (open) walk(n.children, depth + 1);
        } else {
          out.push({ kind: "file", name: n.name, file: n.file, depth });
        }
      }
    }
    walk(tree.children, 0);
    return out;
  });

  function toggleDir(path: string) {
    const next = new Set(collapsed);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    collapsed = next;
  }

  function statusLetter(file: PayloadFile): string {
    switch (file.status) {
      case "added":
        return "A";
      case "deleted":
        return "D";
      case "renamed":
        return "R";
      default:
        return "M";
    }
  }

  function onJump(file: PayloadFile) {
    void review.jumpToFile(file.path);
  }

  function markAll(viewed: boolean) {
    for (const f of review.payload.files) review.setFileViewed(f, viewed);
  }

  function dirViewedState(path: string): { all: boolean; some: boolean } {
    const prefix = path + "/";
    let total = 0;
    let viewed = 0;
    for (const f of review.payload.files) {
      if (f.path === path || f.path.startsWith(prefix)) {
        total++;
        if (review.fileViewed(f)) viewed++;
      }
    }
    return { all: total > 0 && viewed === total, some: viewed > 0 && viewed < total };
  }

  function markDir(path: string, viewed: boolean) {
    const prefix = path + "/";
    for (const f of review.payload.files) {
      if (f.path === path || f.path.startsWith(prefix)) review.setFileViewed(f, viewed);
    }
  }
</script>

<aside
  class="files-rail"
  class:drawer={review.narrow}
  class:open={review.diffOpen}
  id="diff-panel"
  aria-label="Files"
  aria-hidden={!review.diffOpen ? "true" : undefined}
>
  <header class="head">
    <span class="label">Files</span>
    <span class="progress" title="Files marked viewed">
      <b>{viewedCount}</b><span class="slash">/</span>{fileCount}
    </span>
    <button
      type="button"
      class="tuck"
      title={review.narrow ? "Close (Esc)" : "Hide files"}
      aria-label={review.narrow ? "Close files" : "Hide files"}
      onclick={() => review.tuckDiff()}
    >
      {review.narrow ? "✕" : "‹"}
    </button>
  </header>

  <div class="toolbar">
    <input
      class="search"
      type="search"
      placeholder="Filter…"
      bind:value={query}
      aria-label="Filter files"
    />
    <button type="button" class="mini" onclick={() => markAll(true)}>All</button>
    <button type="button" class="mini" onclick={() => markAll(false)}>Clear</button>
  </div>

  <ul class="tree" aria-label="Files to review">
    {#each rows as row (row.kind === "dir" ? `d:${row.path}` : `f:${row.file.path}`)}
      {#if row.kind === "dir"}
        {@const state = dirViewedState(row.path)}
        <li class="row dir" class:open={row.open} style:--d={row.depth}>
          <Check
            checked={state.all}
            ariaLabel={state.all ? `Unmark all under ${row.path}` : `Mark all under ${row.path} viewed`}
            onchange={() => markDir(row.path, !state.all)}
          />
          <button
            type="button"
            class="main"
            aria-expanded={row.open}
            onclick={() => toggleDir(row.path)}
          >
            <span class="twist" aria-hidden="true">{row.open ? "▾" : "▸"}</span>
            <span class="name">{row.name}/</span>
          </button>
        </li>
      {:else}
        {@const viewed = review.fileViewed(row.file)}
        <li class="row file" class:viewed style:--d={row.depth}>
          <Check
            checked={viewed}
            ariaLabel={viewed ? `Unmark ${row.file.path} as viewed` : `Mark ${row.file.path} as viewed`}
            onchange={() => review.setFileViewed(row.file, !viewed)}
          />
          <button type="button" class="main" title={row.file.path} onclick={() => onJump(row.file)}>
            <span class="name">{row.name}</span>
            <span class="meta">
              {#if row.file.adds > 0}<b class="add">+{row.file.adds}</b>{/if}
              {#if row.file.dels > 0}<b class="del">−{row.file.dels}</b>{/if}
              <span class="status" data-status={row.file.status} title={row.file.status}
                >{statusLetter(row.file)}</span
              >
            </span>
          </button>
        </li>
      {/if}
    {:else}
      <li class="empty">No matches</li>
    {/each}
  </ul>
</aside>

<style>
  aside {
    position: sticky;
    top: var(--header-h);
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-h));
    min-height: 0;
    overflow: hidden;
    padding: 0;
    background: var(--bg-raised);
    border-right: var(--border-w) solid var(--border);
  }

  aside:not(.drawer):not(.open) {
    display: none;
  }

  aside.drawer {
    position: fixed;
    top: var(--header-h);
    left: 0;
    bottom: 0;
    z-index: 30;
    width: min(320px, calc(100vw - 40px));
    height: auto;
    padding: 0;
    background: var(--bg-raised);
    border-right: var(--border-w) solid var(--border);
    box-shadow: 6px 0 0 var(--border);
    transform: translateX(-100%);
    visibility: hidden;
    pointer-events: none;
    transition:
      transform 0.12s linear,
      visibility 0.12s linear;
  }

  aside.drawer.open {
    transform: translateX(0);
    visibility: visible;
    pointer-events: auto;
  }

  @media (prefers-reduced-motion: reduce) {
    aside.drawer {
      transition: none;
    }
  }

  .head {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 10px;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-panel);
  }

  .label {
    color: var(--fg);
    font-size: 11px;
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

  .tuck {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    margin: 0 0 0 auto;
    padding: 0;
    border: 2px solid transparent;
    background: transparent;
    color: var(--fg-muted);
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
  }

  .tuck:hover {
    border-color: var(--border);
    background: var(--bg-hover);
    color: var(--fg);
  }

  .toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: stretch;
    border-bottom: var(--border-w) solid var(--border);
  }

  .search {
    flex: 1;
    min-width: 0;
    height: 32px;
    margin: 0;
    padding: 0 10px;
    border: 0;
    border-right: var(--border-w) solid var(--border);
    border-radius: 0;
    background: var(--bg-inset);
    color: var(--fg);
    font-family: var(--font-code);
    font-size: 12px;
    font-weight: 600;
  }

  .search::placeholder {
    color: var(--fg-faint);
    font-weight: 500;
  }

  .search:focus {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .search::-webkit-search-decoration,
  .search::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }

  .mini {
    flex-shrink: 0;
    height: 32px;
    padding: 0 10px;
    border: 0;
    border-right: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    color: var(--fg);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .mini:last-child {
    border-right: 0;
  }

  .mini:hover {
    background: var(--accent);
    color: var(--accent-fg);
  }

  .mini:active {
    background: var(--accent-hover);
  }

  .tree {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 4px 0;
    overflow-y: auto;
    list-style: none;
    background: var(--bg-raised);
  }

  /* One flat row: indent + content. No column borders. */
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 28px;
    padding: 2px 10px 2px calc(10px + var(--d, 0) * 14px);
  }

  .row:hover {
    background: var(--bg-hover);
  }

  .row.dir {
    margin-top: 4px;
    min-height: 26px;
  }

  .row.dir:first-child {
    margin-top: 0;
  }

  .row.file.viewed {
    opacity: 0.55;
  }

  .row.file.viewed:hover {
    opacity: 1;
  }

  .main {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    min-height: 24px;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--fg);
    text-align: left;
    cursor: pointer;
  }

  .twist {
    flex-shrink: 0;
    width: 12px;
    color: var(--fg-muted);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }

  .row.dir .main:hover .twist {
    color: var(--accent);
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-family: var(--font-code);
    font-size: 12px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row.dir .name {
    color: var(--fg-muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: lowercase;
  }

  .row.file.viewed .name {
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }

  .row :global(.check) {
    flex-shrink: 0;
  }

  .meta {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
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

  .status {
    color: var(--fg-faint);
    font-weight: 700;
  }

  .status[data-status="added"] {
    color: var(--selected);
  }

  .status[data-status="deleted"] {
    color: var(--sev-critical);
  }

  .empty {
    padding: 20px 12px;
    color: var(--fg-faint);
    font-size: 12px;
    font-weight: 600;
    text-align: center;
  }
</style>
