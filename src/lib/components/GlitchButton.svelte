<script>
    import { createEventDispatcher } from "svelte";

    export let disabled = false;
    export let className = "";
    export let size = "md"; // sm, md, lg
    export let variant = "primary"; // primary, secondary, ghost, danger

    const dispatch = createEventDispatcher();

    function handleClick(e) {
        if (!disabled) {
            dispatch("click", e);
        }
    }
</script>

<button
    {disabled}
    on:click={handleClick}
    class="glitch-btn {className} size-{size} variant-{variant}"
    class:disabled
>
    <span class="glitch-text">
        <slot />
    </span>
    <span class="glitch-effect"></span>
</button>

<style>
    .glitch-btn {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 600;
        color: var(--color-text-primary);
        border: 1px solid transparent;
        border-radius: var(--radius);
        cursor: pointer;
        overflow: hidden;
        transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        user-select: none;
    }

    /* Sizes */
    .size-sm {
        padding: 6px 12px;
        font-size: 12px;
        height: 32px;
    }

    .size-md {
        padding: 10px 20px;
        font-size: 14px;
        height: 42px;
    }

    .size-lg {
        padding: 14px 28px;
        font-size: 16px;
        height: 52px;
    }

    /* Variants */
    .variant-primary {
        background: linear-gradient(135deg, var(--layer-2), var(--layer-1));
        border-color: var(--border-light);
    }
    .variant-primary:hover {
        border-color: var(--highlight);
        box-shadow: 0 4px 20px rgba(157, 78, 221, 0.15);
        transform: translateY(-1px);
        color: #fff;
    }

    .variant-secondary {
        background: var(--layer-2);
        border-color: var(--border);
    }
    .variant-secondary:hover {
        background: var(--layer-1);
        border-color: var(--border-light);
        color: #fff;
    }

    .variant-ghost {
        background: transparent;
        border-color: transparent;
        color: var(--color-text-secondary);
    }
    .variant-ghost:hover {
        background: var(--layer-2);
        color: var(--color-text-primary);
    }

    .variant-danger {
        background: rgba(255, 69, 58, 0.1);
        border-color: rgba(255, 69, 58, 0.2);
        color: #ff453a;
    }
    .variant-danger:hover {
        background: rgba(255, 69, 58, 0.2);
        border-color: #ff453a;
        box-shadow: 0 4px 20px rgba(255, 69, 58, 0.15);
    }

    /* Disabled */
    .disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
    }

    /* Glitch Effect */
    .glitch-text {
        position: relative;
        z-index: 2;
    }

    .glitch-effect {
        position: absolute;
        inset: 0;
        background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.1) 45%,
            rgba(255, 255, 255, 0.2) 50%,
            rgba(255, 255, 255, 0.1) 55%,
            transparent 100%
        );
        transform: translateX(-100%) skewX(-15deg);
        pointer-events: none;
        z-index: 1;
        opacity: 0;
        transition: opacity 0.2s;
    }

    .glitch-btn:hover .glitch-effect {
        opacity: 1;
        animation: glitch-sweep 1.5s ease-in-out infinite;
    }

    .variant-primary .glitch-effect {
        background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(157, 78, 221, 0.2) 45%,
            rgba(199, 125, 255, 0.4) 50%,
            rgba(157, 78, 221, 0.2) 55%,
            transparent 100%
        );
    }

    @keyframes glitch-sweep {
        0% {
            transform: translateX(-100%) skewX(-15deg);
        }
        50%,
        100% {
            transform: translateX(200%) skewX(-15deg);
        }
    }
</style>
