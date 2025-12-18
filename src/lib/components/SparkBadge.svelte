<script>
    export let text = "Badge";
    export let className = "";
</script>

<div class="spark-badge {className}">
    <!-- Rotating spark effect -->
    <span class="spark-container">
        <span class="spark"></span>
    </span>

    <!-- Background -->
    <span class="backdrop"></span>

    <!-- Text -->
    <span class="text">{text}</span>
</div>

<style>
    .spark-badge {
        position: relative;
        display: inline-grid;
        overflow: hidden;
        border-radius: 999px;
        padding: 4px 12px;
        box-shadow: inset 0 1000px 0 0 hsl(270 50% 15%);
        transition: all 0.2s;
    }

    .spark-badge:hover {
        box-shadow: inset 0 1000px 0 0 hsl(270 50% 20%);
    }

    .spark-container {
        position: absolute;
        inset: 0;
        height: 100%;
        width: 100%;
        overflow: hidden;
        border-radius: inherit;
        mask: linear-gradient(white, transparent 50%);
        -webkit-mask: linear-gradient(white, transparent 50%);
    }

    .spark {
        position: absolute;
        inset: 0 auto auto 50%;
        aspect-ratio: 1;
        width: 200%;
        translate: -50% -15%;
        rotate: -90deg;
        background: conic-gradient(
            from 0deg,
            transparent 0deg 340deg,
            var(--highlight) 360deg
        );
        animation: spark-rotate 3s linear infinite;
    }

    @keyframes spark-rotate {
        from {
            rotate: -90deg;
        }
        to {
            rotate: 270deg;
        }
    }

    .backdrop {
        position: absolute;
        inset: 1px;
        border-radius: inherit;
        background: var(--bg-deep);
        transition: background 0.2s;
    }

    .spark-badge:hover .backdrop {
        background: var(--layer-1);
    }

    .text {
        position: relative;
        z-index: 10;
        font-size: 11px;
        font-weight: 500;
        color: var(--color-text-secondary);
        transition: color 0.2s;
    }

    .spark-badge:hover .text {
        color: var(--highlight);
    }
</style>
