<script lang="ts">
  /** Basename-first path label (dir may ellipsize; base prefers full). */
  interface Props {
    path: string;
    /** Extra class on the root (e.g. "file-meta" / "file-name" host styles). */
    class?: string;
  }

  const { path, class: className = "" }: Props = $props();

  const base = $derived.by(() => {
    const i = path.lastIndexOf("/");
    return i >= 0 ? path.slice(i + 1) : path;
  });
  const dir = $derived.by(() => {
    const i = path.lastIndexOf("/");
    return i > 0 ? path.slice(0, i) : "";
  });
</script>

<span class="path {className}" title={path}>
  <span class="base">{base}</span>
  {#if dir}
    <span class="dir">{dir}</span>
  {/if}
</span>

<style>
  .path {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    font-family: var(--font-code);
    line-height: 1.25;
  }

  .base {
    color: var(--fg-muted);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dir {
    color: color-mix(in srgb, var(--fg-faint) 75%, transparent);
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
