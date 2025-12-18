<script>
    import { createEventDispatcher } from "svelte";

    export let disabled = false;
    export let className = "";

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
    class="glitch-btn {className}"
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
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-primary);
        background: linear-gradient(135deg, var(--layer-2), var(--layer-1));
        border: 1px solid var(--border-light);
        border-radius: var(--radius);
        cursor: pointer;
        overflow: hidden;
        transition: all 0.3s ease;
    }

    .glitch-btn:hover {
        border-color: var(--highlight);
        box-shadow:
            0 0 20px rgba(157, 78, 221, 0.3),
            0 0 40px rgba(157, 78, 221, 0.1);
        transform: translateY(-2px);
    }

    .glitch-btn:hover .glitch-effect {
        opacity: 1;
    }

    .glitch-btn:active {
        transform: translateY(0);
    }

    .glitch-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    :global(.glitch-btn.danger) {
        border-color: rgba(255, 107, 107, 0.3);
    }

    :global(.glitch-btn.danger:hover) {
        border-color: #ff6b6b;
        box-shadow:
            0 0 20px rgba(255, 107, 107, 0.3),
            0 0 40px rgba(255, 107, 107, 0.1);
    }

    :global(.glitch-btn.danger .glitch-effect) {
        background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 107, 107, 0.2) 45%,
            rgba(255, 150, 150, 0.4) 50%,
            rgba(255, 107, 107, 0.2) 55%,
            transparent 100%
        );
    }

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
            rgba(157, 78, 221, 0.2) 45%,
            rgba(199, 125, 255, 0.4) 50%,
            rgba(157, 78, 221, 0.2) 55%,
            transparent 100%
        );
        opacity: 0;
        animation: glitch-sweep 2s ease-in-out infinite;
        pointer-events: none;
    }

    @keyframes glitch-sweep {
        0% {
            transform: translateX(-100%) skewX(-15deg);
        }
        100% {
            transform: translateX(200%) skewX(-15deg);
        }
    }

    .glitch-btn:hover .glitch-effect {
        animation: glitch-sweep 1s ease-in-out infinite;
    }
</style>
