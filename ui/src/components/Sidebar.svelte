<script lang="ts">
  import { onMount } from "svelte";
  import { getReviewState } from "../state.svelte.ts";

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
            <span class="num" aria-hidden="true">{i + 1}</span>
            <span class="step-text">{section.heading}</span>
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
              <li>
                <button
                  type="button"
                  class="meta-name"
                  title={`Jump to ${path}`}
                  onclick={() => jumpToSectionFile(i, path)}
                >
                  {baseName(path)}
                </button>
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
</nav>

<style>
  nav {
    position: sticky;
    top: var(--header-h);
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-h));
    min-height: 0;
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
    align-items: center;
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

  .step-btn.active {
    background: var(--fg);
    color: var(--bg-raised);
  }

  .step-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.25;
  }

  .num {
    flex-shrink: 0;
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

  .step-btn.active .num {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    box-shadow: none;
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

  .meta {
    margin: 0;
    padding: 0 0 4px;
    list-style: none;
    background: var(--bg-inset);
    border-top: 1px solid var(--border);
  }

  .meta li {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 20px;
    padding: 0 6px 0 0;
  }

  .meta-name {
    flex: 1;
    min-width: 0;
    margin: 0;
    padding: 2px 8px;
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
