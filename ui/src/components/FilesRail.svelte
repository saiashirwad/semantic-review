<script lang="ts">
  /**
   * Files panel — hierarchical tree with viewed checkboxes.
   * Compresses single-child dir chains so deep paths stay readable.
   */
  import type { PayloadFile } from "../../../src/payload.ts";
  import { getReviewState } from "../state.svelte.ts";
  import Check from "./Check.svelte";
  import LeftResizeHandle from "./LeftResizeHandle.svelte";

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

  /** Merge `a/b/c` chains where each dir has a single dir child. */
  function compressDir(node: DirNode): DirNode {
    let children = node.children.map((c) => (c.kind === "dir" ? compressDir(c) : c));
    let name = node.name;
    let path = node.path;
    while (children.length === 1 && children[0]!.kind === "dir") {
      const only = children[0] as DirNode;
      name = name ? `${name}/${only.name}` : only.name;
      path = only.path;
      children = only.children;
    }
    return { kind: "dir", name, path, children };
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
    root.children = root.children.map((c) => (c.kind === "dir" ? compressDir(c) : c));
    return root;
  });

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
        <li class="row dir" class:open={row.open} style:--d={row.depth}>
          <button
            type="button"
            class="main"
            aria-expanded={row.open}
            title={row.path}
            onclick={() => toggleDir(row.path)}
          >
            <span class="twist" aria-hidden="true">{row.open ? "▾" : "▸"}</span>
            <span class="name">{row.name}/</span>
          </button>
        </li>
      {:else}
        {@const viewed = review.fileViewed(row.file)}
        {@const note = review.fileNotes.get(row.file.path)}
        <li class="row file" class:viewed style:--d={row.depth}>
          <Check
            checked={viewed}
            ariaLabel={viewed ? `Unmark ${row.file.path} as viewed` : `Mark ${row.file.path} as viewed`}
            onchange={() => review.setFileViewed(row.file, !viewed)}
          />
          <button
            type="button"
            class="main"
            title={note ? `${row.file.path} — ${note}` : row.file.path}
            onclick={() => onJump(row.file)}
          >
            <span class="name">{row.name}</span>
            <span class="meta" aria-hidden="true">
              {#if row.file.adds > 0}<b class="add">+{row.file.adds}</b>{/if}
              {#if row.file.dels > 0}<b class="del">−{row.file.dels}</b>{/if}
              <!-- Only surprising statuses get a letter; A/M are already told by the counts -->
              {#if row.file.status === "deleted" || row.file.status === "renamed"}
                <span class="status" data-status={row.file.status}>{statusLetter(row.file)}</span>
              {/if}
            </span>
          </button>
        </li>
      {/if}
    {:else}
      <li class="empty">No matches</li>
    {/each}
  </ul>

  <LeftResizeHandle />
</aside>

<style>
  aside {
    position: sticky;
    top: var(--header-h);
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-h));
    min-height: 0;
    min-width: 0;
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
    width: min(360px, calc(100vw - 40px));
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
    height: 30px;
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
    height: 30px;
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

  .tree {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 6px 0 12px;
    overflow-x: hidden;
    overflow-y: auto;
    list-style: none;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 26px;
    /* Align files under dirs: check sits where dir has only twist */
    padding: 1px 8px 1px calc(8px + var(--d, 0) * 12px);
    /* Indent guides — one hairline per depth level, painted in the indent gutter */
    background-image: repeating-linear-gradient(
      to right,
      transparent 0 11px,
      color-mix(in srgb, var(--border) 16%, transparent) 11px 12px
    );
    background-repeat: no-repeat;
    background-position: 8px 0;
    background-size: calc(var(--d, 0) * 12px) 100%;
  }

  .row.file {
    /* file check + name align under dir name (past twist) */
    padding-left: calc(8px + var(--d, 0) * 12px + 14px);
  }

  .row:hover {
    background-color: var(--bg-hover);
  }

  .row .main:active {
    transform: translate(1px, 1px);
  }

  @media (prefers-reduced-motion: reduce) {
    .row .main:active {
      transform: none;
    }
  }

  .row.dir {
    margin-top: 2px;
  }

  .row.dir:first-child {
    margin-top: 0;
  }

  .row.file.viewed {
    opacity: 0.5;
  }

  .row.file.viewed:hover {
    opacity: 1;
  }

  .main {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 4px;
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

  .row.dir .main {
    gap: 2px;
  }

  .twist {
    flex-shrink: 0;
    width: 0.85em;
    color: var(--fg-faint);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    text-align: left;
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
    align-items: baseline;
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

  .status {
    min-width: 0.7em;
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
