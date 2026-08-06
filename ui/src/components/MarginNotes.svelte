<script lang="ts">
  import { onMount, tick } from "svelte";
  import { getReviewState, type UiComment } from "../state.svelte.ts";
  import { packMarginNotes } from "../helpers.ts";

  const review = getReviewState();

  type Placed = {
    comment: UiComment;
    index: number;
    top: number;
  };

  let mainEl = $state<HTMLElement | null>(null);
  let placed = $state<Placed[]>([]);
  const NOTE_H = 56;

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
    const inputs: { id: string; y: number; height: number; comment: UiComment; index: number }[] = [];

    review.comments.forEach((comment, index) => {
      if (comment.jump?.kind !== "line") return;
      const { hunkId, idx } = comment.jump;
      const el =
        document.querySelector(`[data-hunk="${CSS.escape(hunkId)}"][data-idx="${idx}"]`) ??
        document.querySelector(`td[data-hunk="${CSS.escape(hunkId)}"][data-idx="${idx}"]`);
      if (!el) return;
      if (el.closest("details:not([open])")) return;
      const y = el.getBoundingClientRect().top + window.scrollY - mainTop;
      inputs.push({ id: String(index), y, height: NOTE_H, comment, index });
    });

    const tops = packMarginNotes(
      inputs.map(({ id, y, height }) => ({ id, y, height })),
      8,
    );
    placed = inputs.map((n) => ({
      comment: n.comment,
      index: n.index,
      top: tops.get(n.id) ?? n.y,
    }));
  }

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
    void review.comments;
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
        title={n.comment.text}
        onclick={() => review.jumpToComment(n.comment)}
      >
        <span class="text">{n.comment.text}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .margin-notes {
    display: none;
    position: absolute;
    top: 0;
    right: 0;
    width: 180px;
    bottom: 0;
    pointer-events: none;
    z-index: 4;
  }

  @media (min-width: 1600px) {
    .margin-notes {
      display: block;
    }
  }

  .note {
    position: absolute;
    right: 0;
    left: 0;
    pointer-events: auto;
    margin: 0;
    padding: 6px 8px;
    border: 2px solid var(--border);
    background: var(--bg-raised);
    box-shadow: var(--shadow-btn);
    text-align: left;
    cursor: pointer;
    color: var(--fg);
  }

  .note::before {
    content: "";
    position: absolute;
    left: -24px;
    top: 10px;
    width: 24px;
    height: 2px;
    background: var(--accent);
  }

  .text {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    font-size: var(--fs-xs);
    line-height: 1.35;
    font-weight: 500;
  }

  .note:hover {
    background: var(--bg-hover);
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
