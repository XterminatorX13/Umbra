<script>
    export let duration = 3;
    export let borderWidth = 1.5;
</script>

<div
    class="shine-border-container"
    style="--duration: {duration}s; --border-width: {borderWidth}px;"
>
    <div class="shine-border"></div>
    <div class="content">
        <slot />
    </div>
</div>

<style>
    .shine-border-container {
        position: relative;
        border-radius: var(--radius);
        padding: var(--border-width);
        background: var(--layer-1);
        overflow: hidden;
    }

    .shine-border {
        position: absolute;
        inset: -50%; /* Extend to ensure coverage during rotation */
        width: 200%;
        height: 200%;
        top: -50%;
        left: -50%;
        background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 80deg,
            var(--highlight) 100deg,
            transparent 120deg,
            transparent 260deg,
            var(--highlight) 280deg,
            transparent 300deg,
            transparent 360deg
        );
        animation: rotate var(--duration) linear infinite;
        opacity: 0.6; /* Softer */
        filter: blur(8px); /* Diffuse light */
    }

    @keyframes rotate {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .content {
        position: relative;
        background: var(--bg-panel);
        border-radius: calc(var(--radius) - var(--border-width));
        z-index: 1;
    }
</style>
