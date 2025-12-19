<script>
    export let duration = 3; // Slower by default
    export let delay = 0;
    export let colorFrom = "var(--accent-1)";
    export let colorVia = "var(--highlight)";
    export let colorTo = "var(--accent-2)";
    export let size = 300; // Larger beam

    let containerRef;
</script>

<div class="border-beam-container" bind:this={containerRef}>
    <div
        class="border-beam"
        style="
      --duration: {duration}s;
      --delay: {delay}s;
      --size: {size}px;
      --color-from: {colorFrom};
      --color-via: {colorVia};
      --color-to: {colorTo};
    "
    ></div>
    <slot />
</div>

<style>
    .border-beam-container {
        position: relative;
        overflow: hidden;
        border-radius: inherit;
    }

    .border-beam {
        position: absolute;
        inset: 0;
        /* Aurora Gradient - Dynamic */
        background: radial-gradient(
            circle at 50% 50%,
            rgba(157, 78, 221, 0.4),
            transparent 70%
        );
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.6s ease;
        pointer-events: none;
        border-radius: inherit;
        z-index: 1;

        /* Subtle blur for refined glow */
        filter: blur(12px);
    }

    /* Hover state - Reveal the aurora */
    .border-beam-container:hover .border-beam {
        opacity: 1;
        animation: aurora-pulse 4s ease-in-out infinite;
    }

    @keyframes aurora-pulse {
        0%,
        100% {
            opacity: 0.6;
            transform: scale(0.95);
        }
        50% {
            opacity: 0.8;
            transform: scale(1.05);
        }
    }

    /* Delicate border line */
    .border-beam-container::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: border-color 0.3s ease;
        pointer-events: none;
        z-index: 2;
    }

    .border-beam-container:hover::after {
        border-color: rgba(157, 78, 221, 0.3);
    }
</style>
