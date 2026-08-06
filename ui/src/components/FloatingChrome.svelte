<script lang="ts">
  import type { Snippet } from "svelte";
  import DragGrip from "./DragGrip.svelte";

  /**
   * Shared shell for absolute/fixed review popovers (composer, findings).
   * Head middle + body are snippets; drag + close + card chrome live here.
   */
  interface Props {
    ariaLabel: string;
    style?: string;
    class?: string;
    ready?: boolean;
    /** Mount on document.body (escape overflow:hidden ancestors). */
    portal?: boolean;
    /** Root element (measure, drag bounds). */
    el?: HTMLElement | null;
    onclose: () => void;
    ondragstart: (e: PointerEvent) => void;
    /** Middle of the header (title, badges, ref, …). */
    head: Snippet;
    children: Snippet;
  }

  let {
    ariaLabel,
    style,
    class: className = "",
    ready = true,
    portal = false,
    el = $bindable<HTMLElement | null>(null),
    onclose,
    ondragstart,
    head,
    children,
  }: Props = $props();

  function attach(node: HTMLElement) {
    el = node;
    if (portal) document.body.appendChild(node);
    return {
      destroy() {
        if (el === node) el = null;
        if (portal) node.remove();
      },
    };
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="float {className}"
  class:ready
  role="dialog"
  aria-label={ariaLabel}
  tabindex="-1"
  use:attach
  {style}
  onclick={(e) => e.stopPropagation()}
  onmousedown={(e) => e.stopPropagation()}
>
  <header class="head">
    <DragGrip onpointerdown={ondragstart} />
    <div class="head-mid">
      {@render head()}
    </div>
    <button type="button" class="close" title="Close (Esc)" onclick={onclose}>✕</button>
  </header>
  <div class="body">
    {@render children()}
  </div>
</div>

<style>
  .float {
    z-index: 40;
    overflow-x: hidden;
    overflow-y: auto;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    color: var(--fg);
    box-shadow: var(--shadow-pop);
    font-family: var(--font-ui);
    white-space: normal;
    word-break: normal;
    text-align: left;
    cursor: auto;
  }

  /* Finding popover waits for first place measure */
  .float:not(.ready) {
    opacity: 0;
    pointer-events: none;
  }

  .float.ready {
    opacity: 1;
    pointer-events: auto;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 0 8px 0 6px;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-panel);
    position: sticky;
    top: 0;
    z-index: 1;
    user-select: none;
  }

  .head-mid {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .close {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin: 0;
    padding: 0;
    border: 2px solid transparent;
    background: transparent;
    color: var(--fg-muted);
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
  }

  .close:hover {
    border-color: var(--border);
    background: var(--bg-hover);
    color: var(--fg);
  }

  .body {
    padding: 12px 14px 14px;
  }

  /* Shared action buttons used by consumers via :global */
  :global(.float .btn) {
    height: 32px;
    padding: 0 12px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    color: var(--fg);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: var(--shadow-btn);
  }

  :global(.float .btn:hover:not(:disabled)) {
    background: var(--bg-hover);
  }

  :global(.float .btn:active:not(:disabled)) {
    transform: translate(1px, 1px);
    box-shadow: none;
  }

  :global(.float .btn.primary),
  :global(.float .btn.save) {
    background: var(--accent);
    color: var(--accent-fg);
  }

  :global(.float .btn.primary:hover:not(:disabled)),
  :global(.float .btn.save:hover:not(:disabled)) {
    background: var(--accent-hover);
  }

  :global(.float .btn.ghost) {
    background: var(--bg-raised);
    color: var(--fg);
  }

  :global(.float .btn:disabled) {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
</style>
