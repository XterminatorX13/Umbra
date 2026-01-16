<script>
    import { onMount, afterUpdate } from "svelte";
    import { createVirtualScroll } from "../../utils/virtualScroll.js";

    export let items = [];
    export let itemHeight = 80;
    export let bufferSize = 5;

    let viewport;
    let visibleItems = [];
    let offsetY = 0;
    let totalHeight = 0;

    const { scroller, setupScrollListener, updateItems } = createVirtualScroll(
        itemHeight,
        bufferSize,
    );

    // Update quando items mudam
    $: if (items && viewport) {
        updateItems(items, viewport, (result) => {
            visibleItems = result.items;
            offsetY = result.offsetY;
            totalHeight = result.totalHeight;
        });
    }

    onMount(() => {
        if (!viewport) return;

        const cleanup = setupScrollListener(viewport, (result) => {
            visibleItems = result.items;
            offsetY = result.offsetY;
            totalHeight = result.totalHeight;
        });

        return cleanup;
    });

    export function scrollTo(top) {
        if (viewport) {
            viewport.scrollTop = top;
        }
    }
</script>

<div
    bind:this={viewport}
    class="virtual-viewport"
    style="
        overflow-y: auto; 
        flex: 1; 
        width: 100%; 
        height: 100%; 
        position: relative; 
        contain: strict;
    "
>
    <!-- Phantom div para manter a altura do scroll -->
    <div
        style="height: {totalHeight}px; width: 1px; position: absolute; top: 0; left: 0; pointer-events: none; opacity: 0;"
    ></div>

    <!-- Conteúdo visível -->
    <div
        style="transform: translateY({offsetY}px); will-change: transform; width: 100%; pointer-events: auto;"
    >
        <slot {visibleItems} />
    </div>
</div>

<style>
    .virtual-viewport {
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
    }
</style>
