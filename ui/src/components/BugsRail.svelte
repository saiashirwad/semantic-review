<script lang="ts">
  import { getReviewState } from "../state.svelte.ts";
  import FindingCard from "./FindingCard.svelte";
  import CommentsList from "./CommentsList.svelte";
  import OverallBox from "./OverallBox.svelte";

  const review = getReviewState();

  let findingsOpen = $state(true);
  let commentsOpen = $state(true);
  let overallOpen = $state(true);
  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  async function copyFindings(e: MouseEvent) {
    e.stopPropagation();
    const open = review.sortedFindings.filter(({ key }) => review.isFindingOpen(key));
    const text = open
      .map(({ finding }) => {
        const lines = [`[${finding.severity}] ${finding.title} — ${review.refForFinding(finding)}`, finding.body];
        if (finding.recommendation.trim()) lines.push(`Fix: ${finding.recommendation}`);
        return lines.join("\n");
      })
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = false), 1200);
    } catch {
      /* clipboard unavailable — leave the button as-is */
    }
  }

  function jumpToNotes() {
    review.closeDrawers();
    document.querySelector('[data-ctx="Agent\'s notes"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
</script>

<aside
  class:drawer={review.narrow}
  class:open={review.reviewOpen}
  id="review-panel"
  aria-label="Review"
  aria-hidden={!review.reviewOpen ? "true" : undefined}
>
  <header class="rail-head">
    <span class="rail-label">Review</span>
    <button
      type="button"
      class="tuck"
      title={review.narrow ? "Close (Esc)" : "Hide review panel"}
      aria-label={review.narrow ? "Close review" : "Hide review panel"}
      onclick={() => review.tuckReview()}
    >
      {review.narrow ? "✕" : "›"}
    </button>
  </header>

  <div class="rail-scroll">
    {#if review.analysis.findings.length > 0}
      <div class="findings-box">
        <button class="findings-head" onclick={() => (findingsOpen = !findingsOpen)}>
          <span class="count-badge">{review.openFindingCount}</span>
          <span class="count-label">Findings</span>
          <span
            role="button"
            tabindex="0"
            class="copy-btn"
            class:copied
            title="Copy open findings as text"
            onclick={copyFindings}
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ") copyFindings(e as unknown as MouseEvent);
            }}
          >
            {copied ? "✓" : "Copy"}
          </span>
          <span class="chevron" class:open={findingsOpen}>▸</span>
        </button>
        {#if findingsOpen}
          <div class="findings-list">
            {#each review.sortedFindings as { finding, key } (key)}
              <FindingCard {finding} {key} />
            {/each}
          </div>
        {/if}
      </div>
    {/if}
    {#if review.analysis.notes.length > 0}
      <button type="button" class="notes-row" title="Jump to the agent's notes" onclick={jumpToNotes}>
        <span class="notes-badge">{review.analysis.notes.length}</span>
        <span class="notes-label">Notes</span>
        <span class="notes-arrow">↓</span>
      </button>
    {/if}
    <button type="button" class="sec-head" onclick={() => (commentsOpen = !commentsOpen)}>
      <span class="sec-label">Comments</span>
      {#if review.comments.length > 0}
        <span class="sec-count">{review.comments.length}</span>
      {/if}
      <span class="chevron" class:open={commentsOpen}>▸</span>
    </button>
    {#if commentsOpen}
      <CommentsList />
    {/if}
  </div>
  <footer class="rail-foot">
    <button type="button" class="sec-head" onclick={() => (overallOpen = !overallOpen)}>
      <span class="sec-label">Overall</span>
      <span class="chevron" class:open={overallOpen}>▸</span>
    </button>
    {#if overallOpen}
      <OverallBox />
    {/if}
  </footer>
</aside>

<style>
  aside {
    position: sticky;
    top: var(--header-h);
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-h));
    width: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    padding: 0;
    background: var(--bg-raised);
    border-left: var(--border-w) solid var(--border);
  }

  /* Block flow inside — cards can never flex-shrink into each other */
  .rail-scroll {
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }

  /* Overall stays docked and visible while the list above scrolls */
  .rail-foot {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-top: var(--border-w) solid var(--border);
  }

  /* Wide tucked: leave the grid entirely */
  aside:not(.drawer):not(.open) {
    display: none;
  }

  /* Narrow: hard-edge right drawer */
  aside.drawer {
    position: fixed;
    top: var(--header-h);
    right: 0;
    bottom: 0;
    left: auto;
    z-index: 30;
    width: min(340px, calc(100vw - 40px));
    height: auto;
    padding: 0;
    background: var(--bg-raised);
    border-left: var(--border-w) solid var(--border);
    box-shadow: -6px 0 0 var(--border);
    transform: translateX(100%);
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

  .rail-head {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 8px;
    height: 36px;
    margin: 0;
    padding: 0 8px;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-panel);
  }

  .rail-label {
    flex: 1;
    color: var(--fg);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .tuck {
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
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
  }

  .tuck:hover {
    border-color: var(--border);
    background: var(--bg-hover);
    color: var(--fg);
  }

  .findings-box {
    width: 100%;
    margin: 0;
    border: 0;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    box-shadow: none;
  }

  .findings-head {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: 0;
    background: var(--bg-inset);
  }

  .findings-head:hover {
    background: var(--bg-hover);
  }

  .findings-head:active {
    transform: translate(1px, 1px);
  }

  @media (prefers-reduced-motion: reduce) {
    .findings-head:active {
      transform: none;
    }
  }

  .count-badge {
    min-width: 20px;
    padding: 0 5px;
    border: var(--border-w) solid var(--border);
    background: var(--sev-critical);
    color: #fff;
    font-size: var(--fs-xs);
    font-weight: 700;
    line-height: 16px;
    text-align: center;
  }

  .count-label {
    flex: 1;
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-align: left;
  }

  .chevron {
    color: var(--fg-faint);
    font-size: var(--fs-sm);
    transition: transform 0.1s;
  }

  .findings-head:hover .chevron {
    color: var(--accent);
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  .findings-list {
    border-top: var(--border-w) solid var(--border);
  }

  .copy-btn {
    flex-shrink: 0;
    padding: 1px 7px;
    border: 1px solid var(--border);
    background: var(--bg-raised);
    color: var(--fg-muted);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .copy-btn:hover {
    background: var(--bg-hover);
    color: var(--fg);
  }

  .copy-btn.copied {
    background: var(--selected);
    border-color: var(--selected);
    color: #fff;
  }

  /* Flags-style row surfacing the agent's notes buried in main */
  .notes-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 32px;
    padding: 0 10px;
    border: 0;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-panel);
    cursor: pointer;
  }

  .notes-row:hover {
    background: var(--bg-hover);
  }

  .notes-badge {
    min-width: 20px;
    padding: 0 5px;
    border: var(--border-w) solid var(--border);
    background: var(--sev-info);
    color: #fff;
    font-size: var(--fs-xs);
    font-weight: 700;
    line-height: 16px;
    text-align: center;
  }

  .notes-label {
    flex: 1;
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-align: left;
  }

  .notes-arrow {
    color: var(--fg-faint);
    font-size: var(--fs-sm);
  }

  .notes-row:hover .notes-arrow {
    color: var(--accent);
  }

  /* Collapsible section headers — Comments / Overall */
  .sec-head {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin: 0;
    padding: 8px 10px 6px;
    border: 0;
    border-bottom: 1px solid var(--border);
    background: var(--bg-inset);
    cursor: pointer;
  }

  .sec-head:hover {
    background: var(--bg-hover);
  }

  .sec-label {
    flex: 1;
    color: var(--fg);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    line-height: var(--lh-tight);
    text-align: left;
  }

  .sec-count {
    min-width: 16px;
    padding: 0 4px;
    border: 1px solid var(--border);
    background: var(--bg-raised);
    color: var(--fg);
    font-family: var(--font-code);
    font-size: 10px;
    font-weight: 700;
    line-height: 14px;
    text-align: center;
  }

  .sec-head:hover .chevron {
    color: var(--accent);
  }

</style>
