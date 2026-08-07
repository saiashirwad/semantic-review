<script lang="ts">
  import { onMount } from "svelte";
  import { getReviewState } from "../state.svelte.ts";
  import LeftResizeHandle from "./LeftResizeHandle.svelte";

  const review = getReviewState();

  let activeId = $state("section-0");
  /**
   * While true, ignore IntersectionObserver updates. Smooth scroll passes
   * intermediate sections which would otherwise flash the wrong active step.
   */
  let pinActive = false;
  /** Bumped on each selectStep so stale scrollend/timeouts can't unlock a newer pin. */
  let pinGen = 0;
  let pinTimer: ReturnType<typeof setTimeout> | null = null;

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

  /** Per-section weight: files touched and +/− lines across its hunks. */
  const sectionStats = $derived(
    review.analysis.sections.map((_, i) => {
      let adds = 0;
      let dels = 0;
      for (const id of sectionHunkIds(i)) {
        const entry = review.hunkIndex.get(id);
        if (!entry) continue;
        for (const line of entry.hunk.lines) {
          if (line.kind === "add") adds++;
          else if (line.kind === "del") dels++;
        }
      }
      return { files: sectionFiles[i].length, adds, dels };
    }),
  );

  /** Section fully viewed = every one of its hunks marked viewed. */
  const sectionViewed = $derived(
    review.analysis.sections.map((_, i) => {
      const hunks = sectionHunkIds(i);
      if (hunks.size === 0) return false;
      for (const id of hunks) if (!review.viewedHunks.has(id)) return false;
      return true;
    }),
  );

  const sectionFindingCounts = $derived(
    review.analysis.sections.map((_, i) => {
      const hunks = sectionHunkIds(i);
      let n = 0;
      for (const path of sectionFiles[i]) {
        n += review.openFindingsFor(path, hunks).length;
      }
      return n;
    }),
  );

  function sectionHunkIds(sectionIndex: number): Set<string> {
    return new Set(review.analysis.sections[sectionIndex]?.snippets.map((s) => s.hunk_id) ?? []);
  }

  /** One file's weight and viewed-ness within a section's hunks only. */
  function sectionFileStats(sectionIndex: number, path: string) {
    let adds = 0;
    let dels = 0;
    let viewed = true;
    let any = false;
    for (const id of sectionHunkIds(sectionIndex)) {
      const entry = review.hunkIndex.get(id);
      if (!entry || entry.file.path !== path) continue;
      any = true;
      if (!review.viewedHunks.has(id)) viewed = false;
      for (const line of entry.hunk.lines) {
        if (line.kind === "add") adds++;
        else if (line.kind === "del") dels++;
      }
    }
    return { adds, dels, viewed: any && viewed };
  }

  /** Set active step and hold it until programmatic scroll settles. */
  function selectStep(id: string) {
    activeId = id;
    pinActive = true;
    const gen = ++pinGen;
    if (pinTimer) clearTimeout(pinTimer);

    const release = () => {
      if (gen !== pinGen) return;
      pinActive = false;
      pinTimer = null;
    };

    window.addEventListener("scrollend", release, { once: true, capture: true });
    pinTimer = setTimeout(release, 900);
  }

  function jump(id: string) {
    selectStep(id);
    review.closeDrawers();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function jumpFirstFinding(sectionIndex: number, path: string) {
    const hit = review.openFindingsFor(path, sectionHunkIds(sectionIndex))[0];
    if (hit) void review.jumpToFinding(hit.key);
  }

  function jumpFirstInSection(sectionIndex: number) {
    const hunks = sectionHunkIds(sectionIndex);
    for (const path of sectionFiles[sectionIndex]) {
      const hit = review.openFindingsFor(path, hunks)[0];
      if (hit) {
        void review.jumpToFinding(hit.key);
        return;
      }
    }
  }

  /** Scroll to this file's first excerpt in the section, else its full-diff block. */
  function jumpToSectionFile(sectionIndex: number, path: string) {
    selectStep(`section-${sectionIndex}`);
    review.closeDrawers();

    const section = review.analysis.sections[sectionIndex];
    let hunkId: string | null = null;
    for (const snippet of section?.snippets ?? []) {
      const entry = review.hunkIndex.get(snippet.hunk_id);
      if (entry?.file.path === path) {
        hunkId = snippet.hunk_id;
        break;
      }
    }

    if (hunkId) {
      const el = document.getElementById(`hunk-${hunkId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("jump-flash");
        window.setTimeout(() => el.classList.remove("jump-flash"), 900);
        return;
      }
    }

    void review.jumpToFile(path);
  }

  function baseName(path: string) {
    const i = path.lastIndexOf("/");
    return i >= 0 ? path.slice(i + 1) : path;
  }

  onMount(() => {
    // Narrative sections only — full diff is its own Files panel, not a walk step.
    const ids = review.analysis.sections.map((_, i) => `section-${i}`);
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        }
        if (pinActive) return;
        let bestId = "";
        let bestRatio = 0;
        for (const id of ids) {
          const ratio = visible.get(id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId) activeId = bestId;
      },
      { rootMargin: "-12% 0px -50% 0px", threshold: [0, 0.15, 0.35, 0.55, 0.75] },
    );
    for (const el of elements) observer.observe(el);
    return () => {
      observer.disconnect();
      if (pinTimer) clearTimeout(pinTimer);
      pinGen++;
    };
  });
</script>

<nav
  class="sidebar"
  class:drawer={review.narrow}
  class:open={review.walkOpen}
  id="walk-panel"
  aria-label="Walkthrough"
  aria-hidden={!review.walkOpen ? "true" : undefined}
>
  <header class="head">
    <span class="label">Walk</span>
    <button
      type="button"
      class="tuck"
      title={review.narrow ? "Close (Esc)" : "Hide walkthrough"}
      aria-label={review.narrow ? "Close walkthrough" : "Hide walkthrough"}
      onclick={() => review.tuckWalk()}
    >
      {review.narrow ? "✕" : "‹"}
    </button>
  </header>

  <ol class="steps">
    {#each review.analysis.sections as section, i}
      {@const id = `section-${i}`}
      {@const active = activeId === id}
      {@const findings = sectionFindingCounts[i]}
      <li class="step" class:active>
        <div class="step-row">
          <button
            type="button"
            class="step-btn"
            class:active
            aria-current={active ? "true" : undefined}
            onclick={() => jump(id)}
          >
            <span class="num" class:done={sectionViewed[i]} aria-hidden="true">
              {#if sectionViewed[i]}✓{:else}{i + 1}{/if}
            </span>
            <span class="step-text">
              <span class="step-heading">{section.heading}</span>
              {#if section.deck}
                <span class="step-deck">{section.deck}</span>
              {/if}
              {#if sectionStats[i].adds + sectionStats[i].dels > 0}
                <span class="step-stats">
                  {sectionStats[i].files} file{sectionStats[i].files === 1 ? "" : "s"} ·
                  <b class="add">+{sectionStats[i].adds}</b>
                  <b class="del">−{sectionStats[i].dels}</b>
                </span>
              {/if}
            </span>
          </button>
          {#if findings > 0}
            <button
              type="button"
              class="badge"
              title="{findings} open finding{findings === 1 ? '' : 's'} — jump to first"
              onclick={() => jumpFirstInSection(i)}
            >
              {findings}
            </button>
          {/if}
        </div>

        {#if active && sectionFiles[i].length > 0}
          {@const hunks = sectionHunkIds(i)}
          <ul class="meta">
            {#each sectionFiles[i] as path}
              {@const n = review.openFindingsFor(path, hunks).length}
              {@const fs = sectionFileStats(i, path)}
              <li>
                <span class="tick" class:done={fs.viewed} aria-hidden="true">{fs.viewed ? "✓" : ""}</span>
                <button
                  type="button"
                  class="meta-name"
                  title={`Jump to ${path}`}
                  onclick={() => jumpToSectionFile(i, path)}
                >
                  {baseName(path)}
                </button>
                {#if fs.adds + fs.dels > 0}
                  <span class="fstats" aria-hidden="true">
                    <b class="add">+{fs.adds}</b>
                    <b class="del">−{fs.dels}</b>
                  </span>
                {/if}
                {#if n > 0}
                  <button
                    type="button"
                    class="badge sm"
                    title="{n} open finding{n === 1 ? '' : 's'}"
                    onclick={() => jumpFirstFinding(i, path)}
                  >
                    {n}
                  </button>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
  </ol>
  <LeftResizeHandle />
</nav>

<style>
  nav {
    position: sticky;
    top: var(--header-h);
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-h));
    min-height: 0;
    min-width: 0;
    overflow-y: auto;
    padding: 0;
    background: var(--bg-raised);
    border-right: var(--border-w) solid var(--border);
  }

  nav:not(.drawer):not(.open) {
    display: none;
  }

  nav.drawer {
    position: fixed;
    top: var(--header-h);
    left: 0;
    bottom: 0;
    z-index: 30;
    width: min(300px, calc(100vw - 40px));
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

  nav.drawer.open {
    transform: translateX(0);
    visibility: visible;
    pointer-events: auto;
  }

  @media (prefers-reduced-motion: reduce) {
    nav.drawer {
      transition: none;
    }
  }

  .head {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    height: 36px;
    margin: 0;
    padding: 0 8px;
    border-bottom: var(--border-w) solid var(--border);
    background: var(--bg-panel);
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

  .label {
    color: var(--fg);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .steps {
    flex: 1;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .step {
    margin: 0;
    border-bottom: 1px solid var(--border);
  }

  .step-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding-right: 6px;
  }

  .step-btn {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    flex: 1;
    min-width: 0;
    min-height: 32px;
    padding: 6px 8px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--fg-muted);
    font-size: 12px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }

  .step-btn:hover {
    background: var(--bg-hover);
    color: var(--fg);
  }

  .step-btn:active {
    transform: translate(1px, 1px);
  }

  @media (prefers-reduced-motion: reduce) {
    .step-btn:active {
      transform: none;
    }
  }

  /* Active fill paints the whole row — button AND badge sit on the ink */
  .step.active .step-row {
    background: var(--fg);
    box-shadow: inset 3px 0 0 var(--accent);
  }

  .step-btn.active {
    background: transparent;
    color: var(--bg-raised);
  }

  .step-btn.active:hover {
    background: transparent;
    color: var(--bg-raised);
  }

  /* Border matches the ink fill — reads as a clean orange chip on black */
  .step.active .badge {
    border-color: var(--fg);
  }

  .step-text {
    flex: 1;
    min-width: 0;
    line-height: 1.25;
  }

  .step-heading {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* One-line deck under the heading — the rail reads as a story */
  .step-deck {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    margin-top: 2px;
    color: var(--fg-faint);
    font-size: 11px;
    font-weight: 500;
    line-height: 1.35;
  }

  .step-btn.active .step-deck {
    color: color-mix(in srgb, var(--bg-raised) 72%, transparent);
  }

  /* Section weight — reviewer sees the monster section before scrolling */
  .step-stats {
    display: block;
    margin-top: 2px;
    color: var(--fg-faint);
    font-family: var(--font-code);
    font-size: 10px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .step-stats .add {
    color: var(--selected);
  }

  .step-stats .del {
    color: var(--sev-critical);
  }

  .step-btn.active .step-stats {
    color: color-mix(in srgb, var(--bg-raised) 60%, transparent);
  }

  .num {
    flex-shrink: 0;
    margin-top: 1px;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border: var(--border-w) solid var(--border);
    background: var(--bg-raised);
    color: var(--fg);
    font-family: var(--font-code);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }

  /* Fully-viewed section — the chapter is done */
  .num.done {
    background: var(--selected);
    border-color: var(--border);
    color: #fff;
  }

  .step-btn.active .num {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    box-shadow: none;
  }

  .step-btn.active .num.done {
    background: var(--selected);
    border-color: var(--selected);
  }

  .badge {
    flex-shrink: 0;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border: var(--border-w) solid var(--border);
    background: var(--accent);
    color: var(--accent-fg);
    font-family: var(--font-code);
    font-size: 10px;
    font-weight: 700;
    line-height: 12px;
    text-align: center;
    cursor: pointer;
  }

  .badge.sm {
    min-width: 14px;
    height: 14px;
    font-size: 9px;
    line-height: 10px;
  }

  .badge:hover {
    background: var(--accent-hover);
  }

  /* Section contents — carries the active section's accent rule */
  .meta {
    margin: 0;
    padding: 3px 0 5px;
    list-style: none;
    background: var(--bg-inset);
    border-top: 1px solid var(--border);
    box-shadow: inset 3px 0 0 var(--accent);
  }

  .meta li {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 22px;
    padding: 0 6px 0 10px;
  }

  /* Per-file viewed tick — passive; the Files rail owns the checkbox */
  .tick {
    flex-shrink: 0;
    width: 12px;
    height: 12px;
    border: 1px solid var(--border);
    background: var(--bg-raised);
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    line-height: 10px;
    text-align: center;
  }

  .tick.done {
    background: var(--selected);
    border-color: var(--selected);
  }

  .fstats {
    flex-shrink: 0;
    font-family: var(--font-code);
    font-size: 9px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .fstats .add {
    color: var(--selected);
  }

  .fstats .del {
    color: var(--sev-critical);
  }

  .meta-name {
    flex: 1;
    min-width: 0;
    margin: 0;
    padding: 2px 4px;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--fg-muted);
    font-family: var(--font-code);
    font-size: 10px;
    font-weight: 600;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }

  .meta-name:hover {
    color: var(--fg);
    background: var(--bg-hover);
  }
</style>
