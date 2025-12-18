<script>
    export let duration = 2; // Animation duration in seconds
    export let delay = 0; // Animation delay
    export let colorFrom = "#8b5cf6"; // Purple
    export let colorVia = "#d96fff"; // Highlight pink
    export let colorTo = "#d946ef"; // Pink
    export let size = 200; // Beam size in pixels

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
        /* Create a gradient that travels */
        background: linear-gradient(
            90deg,
            transparent,
            var(--color-from),
            var(--color-via),
            var(--color-to),
            transparent
        );
        width: var(--size);
        height: 100%;
        opacity: 0;
        animation: beam-travel var(--duration) ease-in-out infinite;
        animation-delay: var(--delay);
        pointer-events: none;
        border-radius: inherit;

        /* Blur for glow effect */
        filter: blur(8px);
    }

    /* Hover state - make beam visible */
    .border-beam-container:hover .border-beam {
        opacity: 1;
    }

    @keyframes beam-travel {
        0% {
            transform: translateX(-100%);
            opacity: 0;
        }
        10% {
            opacity: 1;
        }
        90% {
            opacity: 1;
        }
        100% {
            transform: translateX(calc(100vw));
            opacity: 0;
        }
    }

    /* Mask to only show on borders */
    .border-beam::before {
        content: "";
        position: absolute;
        inset: 1px;
        background: transparent;
        border-radius: inherit;
    }
</style>
