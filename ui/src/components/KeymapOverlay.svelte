<script lang="ts">
  import { onMount } from "svelte";
  import { getReviewState } from "../state.svelte.ts";

  const review = getReviewState();

  const BINDINGS: { keys: string[]; action: string }[] = [
    { keys: ["j"], action: "Next hunk" },
    { keys: ["k"], action: "Previous hunk" },
    { keys: ["v"], action: "Toggle viewed" },
    { keys: ["n"], action: "Next finding" },
    { keys: ["p"], action: "Previous finding" },
    { keys: ["c"], action: "Comment on cursor hunk" },
    { keys: ["⇧", "D"], action: "Done (submit review)" },
    { keys: ["?"], action: "Toggle this keymap" },
    { keys: ["Esc"], action: "Close overlays" },
  ];

  let pressed = $state<string | null>(null);
  let pressTimer: ReturnType<typeof setTimeout> | null = null;

  function matchKey(e: KeyboardEvent): string | null {
    if (e.key === "Escape") return "Esc";
    if (e.key === "?") return "?";
    if (e.shiftKey && (e.key === "D" || e.key === "d")) return "D";
    if (e.key.length === 1) return e.key.toLowerCase();
    return null;
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!review.keymapOpen) return;
      const k = matchKey(e);
      if (!k) return;
      pressed = k === "D" ? "D" : k;
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        pressed = null;
        pressTimer = null;
      }, 100);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (pressTimer) clearTimeout(pressTimer);
    };
  });
</script>

{#if review.keymapOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="scrim" onclick={() => (review.keymapOpen = false)}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="card"
      role="dialog"
      tabindex="-1"
      aria-label="Keyboard shortcuts"
      onclick={(e) => e.stopPropagation()}
    >
      <header>
        <span class="kicker">Keymap</span>
        <button type="button" class="close" onclick={() => (review.keymapOpen = false)}>✕</button>
      </header>
      <div class="cols">
        {#each BINDINGS as b}
          <div class="row">
            <span class="keys">
              {#each b.keys as k}
                <kbd class:pressed={pressed === k || (k === "⇧" && pressed === "D")}>{k}</kbd>
              {/each}
            </span>
            <span class="action">{b.action}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--fg) 35%, transparent);
    padding: 20px;
  }

  .card {
    width: min(480px, 100%);
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-pop);
  }

  header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-panel);
  }

  .kicker {
    flex: 1;
    color: var(--accent);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .close {
    width: 28px;
    height: 28px;
    margin: 0;
    padding: 0;
    border: 2px solid transparent;
    background: transparent;
    color: var(--fg-muted);
    font-weight: 700;
    cursor: pointer;
  }

  .close:hover {
    border-color: var(--border);
    background: var(--bg-hover);
    color: var(--fg);
  }

  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    padding: 8px 0;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
  }

  .keys {
    display: inline-flex;
    gap: 4px;
    flex-shrink: 0;
    min-width: 56px;
  }

  kbd {
    display: inline-block;
    min-width: 1.4em;
    padding: 1px 7px;
    border: 2px solid var(--border);
    background: var(--bg-inset);
    color: var(--fg);
    font-family: var(--font-code);
    font-size: 12px;
    font-weight: 700;
    line-height: 1.5;
    text-align: center;
    box-shadow: var(--shadow-btn);
    transition:
      transform 80ms cubic-bezier(0.2, 0, 0, 1),
      box-shadow 80ms cubic-bezier(0.2, 0, 0, 1);
  }

  kbd.pressed {
    transform: translate(2px, 2px);
    box-shadow: 0 0 0 var(--border);
  }

  .action {
    color: var(--fg-muted);
    font-size: var(--fs-sm);
    font-weight: 500;
  }

  @media (max-width: 520px) {
    .cols {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    kbd.pressed {
      transform: none;
    }
  }
</style>
