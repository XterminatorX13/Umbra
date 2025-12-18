<script>
    import { onMount } from "svelte";

    export let className = "";
    export let spotlight = true; // Mouse-following spotlight effect

    let cardRef;
    let mouseX = 0;
    let mouseY = 0;
    let cardX = 0;
    let cardY = 0;

    function handleMouseMove(e) {
        if (!spotlight || !cardRef) return;

        const rect = cardRef.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    }

    onMount(() => {
        if (cardRef) {
            const rect = cardRef.getBoundingClientRect();
            cardX = rect.left;
            cardY = rect.top;
        }
    });
</script>

<div
    bind:this={cardRef}
    class="magic-card {className}"
    on:mousemove={handleMouseMove}
    role="article"
>
    {#if spotlight}
        <div
            class="spotlight"
            style="
        --mouse-x: {mouseX}px;
        --mouse-y: {mouseY}px;
      "
        ></div>
    {/if}

    <div class="magic-card-content">
        <slot />
    </div>
</div>

<style>
    .magic-card {
        position: relative;
        background: linear-gradient(
            135deg,
            rgba(26, 26, 36, 0.9),
            rgba(30, 30, 46, 0.9)
        );
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        /* Glassmorphism */
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
    }

    .magic-card:hover {
        border-color: rgba(217, 111, 255, 0.3);
        transform: translateY(-2px);
        box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(217, 111, 255, 0.1) inset;
    }

    .magic-card-content {
        position: relative;
        z-index: 2;
    }

    /* Spotlight effect that follows mouse */
    .spotlight {
        position: absolute;
        width: 300px;
        height: 300px;
        background: radial-gradient(
            circle at center,
            rgba(139, 92, 246, 0.15),
            rgba(217, 111, 255, 0.08),
            transparent 70%
        );
        pointer-events: none;
        transition: opacity 0.3s ease;
        opacity: 0;
        left: var(--mouse-x);
        top: var(--mouse-y);
        transform: translate(-50%, -50%);
        z-index: 1;
    }

    .magic-card:hover .spotlight {
        opacity: 1;
    }

    /* Subtle gradient overlay */
    .magic-card::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.03),
            transparent 50%,
            rgba(217, 111, 255, 0.03)
        );
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
        z-index: 1;
    }

    .magic-card:hover::before {
        opacity: 1;
    }
</style>
