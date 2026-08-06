<script lang="ts">
  interface Props {
    checked: boolean;
    /** Visible label next to the box. Omit for icon-only. */
    label?: string;
    /** Accessible name when label is empty or insufficient. */
    ariaLabel?: string;
    /** Larger hit area for tight row layouts (sidebar checklist). */
    pad?: boolean;
    /** Stop click from bubbling (e.g. inside <summary>/<details>). */
    stopPropagation?: boolean;
    onchange?: (checked: boolean) => void;
  }

  const {
    checked,
    label = "",
    ariaLabel,
    pad = false,
    stopPropagation = false,
    onchange,
  }: Props = $props();

  function toggle(e: MouseEvent) {
    if (stopPropagation) e.stopPropagation();
    onchange?.(!checked);
  }
</script>

<button
  type="button"
  class="check"
  class:on={checked}
  class:pad
  class:labeled={!!label}
  role="checkbox"
  aria-checked={checked}
  aria-label={ariaLabel ?? (label || undefined)}
  onclick={toggle}
>
  <span class="face" aria-hidden="true">
    {#if checked}
      <svg viewBox="0 0 12 12" width="10" height="10">
        <path
          d="M2 6.2 L4.8 9 L10 3"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="square"
          stroke-linejoin="miter"
        />
      </svg>
    {/if}
  </span>
  {#if label}
    <span class="text">{label}</span>
  {/if}
</button>

<style>
  .check {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: 1;
    cursor: pointer;
    vertical-align: middle;
  }

  .check.pad {
    justify-content: center;
    width: 32px;
    min-height: 34px;
    padding: 0;
    background: var(--bg-panel);
  }

  .check.pad:hover {
    background: var(--bg-hover);
  }

  .check.pad.on {
    background: color-mix(in srgb, var(--selected) 12%, var(--bg-panel));
  }

  .check.labeled {
    padding: 4px 8px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-panel);
    color: var(--fg-muted);
    font-size: var(--fs-xs);
    font-weight: 600;
  }

  .check.labeled:hover {
    background: var(--bg-hover);
    color: var(--fg);
  }

  .check.labeled.on {
    background: color-mix(in srgb, var(--selected) 12%, var(--bg-panel));
    color: var(--fg);
  }

  .check:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .face {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    background: var(--bg-raised);
    box-shadow: 1px 1px 0 color-mix(in srgb, var(--border) 30%, transparent);
    color: #fff;
  }

  .check.on .face {
    background: var(--selected);
    box-shadow: 1px 1px 0 var(--border);
  }

  .text {
    white-space: nowrap;
  }
</style>
