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
        inset: 0;
        border-radius: inherit;
        background: conic-gradient(
            from 0deg,
            transparent 0deg,
            var(--highlight) 60deg,
            transparent 120deg
        );
        animation: rotate var(--duration) linear infinite;
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
