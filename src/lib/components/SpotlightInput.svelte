<script>
    import { onMount } from "svelte";

    export let value = "";
    export let placeholder = "";
    export let type = "text";
    export let className = "";

    let container;

    function handleMouseMove(e) {
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        container.style.setProperty("--x", `${x}px`);
        container.style.setProperty("--y", `${y}px`);
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    bind:this={container}
    on:mousemove={handleMouseMove}
    class="relative group rounded-lg bg-[var(--layer-2)] p-[1px] overflow-hidden {className}"
>
    <!-- Spotlight Gradient (Border) -->
    <div
        class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style="background: radial-gradient(400px circle at var(--x) var(--y), var(--highlight), transparent 40%);"
    ></div>

    <!-- Inner Input -->
    <input
        {type}
        {value}
        on:blur
        on:input={(e) => {
            value = e.currentTarget.value;
        }}
        {placeholder}
        class="relative w-full h-full bg-[var(--bg-panel)] text-[var(--color-text-primary)] rounded-[7px] px-3 py-2 text-sm outline-none placeholder-[var(--color-text-tertiary)] transition-all duration-200 focus:bg-[var(--layer-1)]"
    />
</div>

<style>
    /* Ensure the input sits above the spotlight div but allows clicks */
    input {
        z-index: 2;
    }
</style>
