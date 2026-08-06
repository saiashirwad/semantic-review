<script lang="ts">
  import { onMount, tick } from "svelte";
  import { getReviewState, type UiComment } from "../state.svelte.ts";
  import { packMarginNotes } from "../helpers.ts";

  const review = getReviewState();

  type Placed = {
    comment: UiComment;
    index: number;
    top: number;
    /** Source line element — hover highlights its row. */
    el: Element;
  };

  let mainEl = $state<HTMLElement | null>(null);
  let placed = $state<Placed[]>([]);
  /** Collapsed marker height — packing spaces markers, not open cards. */
  const NOTE_H = 26;

  function resolveMain(): HTMLElement | null {
    return document.querySelector("main");
  }

  function recompute() {
    const main = resolveMain();
    mainEl = main;
    if (!main) {
      placed = [];
      return;
    }
    const mainRect = main.getBoundingClientRect();
    const mainTop = mainRect.top + window.scrollY;
    const inputs: { id: string; y: number; height: number; comment: UiComment; index: number; el: Element }[] = [];

    review.comments.forEach((comment, index) => {
      if (comment.jump?.kind !== "line") return;
      const { hunkId, idx } = comment.jump;
      const el =
        document.querySelector(`[data-hunk="${CSS.escape(hunkId)}"][data-idx="${idx}"]`) ??
        document.querySelector(`td[data-hunk="${CSS.escape(hunkId)}"][data-idx="${idx}"]`);
      if (!el) return;
      if (el.closest("details:not([open])")) return;
      const y = el.getBoundingClientRect().top + window.scrollY - mainTop;
      inputs.push({ id: String(index), y, height: NOTE_H, comment, index, el });
    });

    const tops = packMarginNotes(
      inputs.map(({ id, y, height }) => ({ id, y, height })),
      8,
    );
    placed = inputs.map((n) => ({
      comment: n.comment,
      index: n.index,
      top: tops.get(n.id) ?? n.y,
      el: n.el,
    }));
  }

  /** Marker under the pointer / focus — highlights its source row. */
  let hovered = $state<Placed | null>(null);

  $effect(() => {
    const n = hovered;
    if (!n) return;
    const row = n.el.closest("tr") ?? n.el.closest("[data-line]") ?? n.el;
    row.classList.add("peek-line");
    return () => row.classList.remove("peek-line");
  });

  onMount(() => {
    const main = resolveMain();
    if (!main) return;

    const ro = new ResizeObserver(() => recompute());
    ro.observe(main);
    window.addEventListener("resize", recompute);
    const onToggle = () => recompute();
    main.addEventListener("toggle", onToggle, true);

    void tick().then(recompute);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
      main.removeEventListener("toggle", onToggle, true);
    };
  });

  $effect(() => {
    // Read length + items so pushes to the deeply-reactive array re-trigger;
    // a bare property read tracks only reassignment of the field itself.
    for (const c of review.comments) void c.jump;
    void review.activeResult;
    void tick().then(recompute);
  });
</script>

{#if placed.length > 0}
  <div class="margin-notes" aria-label="Margin comments">
    {#each placed as n (n.index)}
      <button
        type="button"
        class="note"
        style:top="{n.top}px"
        aria-label={`Comment at ${n.comment.ref}: ${n.comment.text}`}
        onmouseenter={() => (hovered = n)}
        onmouseleave={() => (hovered = null)}
        onfocus={() => (hovered = n)}
        onblur={() => (hovered = null)}
        onclick={() => review.jumpToComment(n.comment)}
      >
        <span class="dot" aria-hidden="true"></span>
        <span class="card">
          <span class="text">{n.comment.text}</span>
          <span class="ref">{n.comment.ref}</span>
        </span>
      </button>
    {/each}
  </div>
{/if}

<style>
  /* Zero-width layer at main's right edge — markers overlay the content,
     nothing reserves reading width. */
  .margin-notes {
    display: none;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 0;
    pointer-events: none;
    z-index: 6;
  }

  @media (min-width: 1120px) {
    .margin-notes {
      display: block;
    }
  }

  /* Collapsed: a small chip. Hover/focus: expands leftward into the card. */
  .note {
    position: absolute;
    right: 4px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 26px;
    max-height: 24px;
    overflow: hidden;
    pointer-events: auto;
    margin: 0;
    padding: 5px 7px;
    border: 2px solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-btn);
    text-align: left;
    cursor: pointer;
    color: var(--fg);
  }

  .note:hover,
  .note:focus-visible {
    z-index: 7;
    width: 280px;
    max-height: none;
    background: var(--bg-raised);
  }

  .dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    margin-top: 3px;
    border: 1px solid var(--border);
    background: var(--accent);
  }

  .card {
    display: none;
    min-width: 0;
  }

  .note:hover .card,
  .note:focus-visible .card {
    display: block;
  }

  .text {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
    line-clamp: 6;
    font-size: var(--fs-xs);
    line-height: 1.35;
    font-weight: 500;
  }

  .ref {
    display: block;
    margin-top: 3px;
    overflow: hidden;
    color: var(--fg-faint);
    font-family: var(--font-code);
    font-size: var(--fs-xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .note:active {
    transform: translate(1px, 1px);
  }

  @media (prefers-reduced-motion: reduce) {
    .note:active {
      transform: none;
    }
  }
</style>
