<script lang="ts">
  interface Props {
    label: string;
    color?: string;
    /** Larger hero stamp on the finished screen. */
    size?: "md" | "lg";
  }

  const { label, color = "var(--selected)", size = "md" }: Props = $props();
</script>

<span class="stamp" class:lg={size === "lg"} style:color={color} aria-hidden="true">{label}</span>

<style>
  .stamp {
    display: inline-block;
    padding: 2px 10px;
    border: 3px solid currentColor;
    background: transparent;
    font-family: var(--font-label);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
    transform: rotate(-8deg);
    pointer-events: none;
    user-select: none;
    animation: stamp-in 160ms cubic-bezier(0.2, 1.2, 0.3, 1) both;
  }

  .stamp.lg {
    font-size: 40px;
    padding: 8px 20px;
    border-width: 4px;
    letter-spacing: 0.1em;
    animation: stamp-in 250ms cubic-bezier(0.2, 1.2, 0.3, 1) both;
    animation-delay: 250ms;
  }

  @keyframes stamp-in {
    from {
      transform: rotate(-8deg) scale(1.6);
      opacity: 0;
    }
    60% {
      transform: rotate(-8deg) scale(0.94);
      opacity: 1;
    }
    to {
      transform: rotate(-8deg) scale(1);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .stamp {
      animation: none;
    }
  }
</style>
