<script lang="ts">
    import { cn } from "../../utils/cn";

    export let open = false;
    export let items: Array<{ id: string; label: string; icon?: string }> = [];
    export let className: string = "";

    let el: HTMLElement;
</script>

{#if open}
    <div
        bind:this={el}
        class={cn(
            "absolute z-50 mt-1 min-w-[8rem] rounded-md border border-border bg-bg-panel p-1 shadow-[0_8px_20px_rgba(217,111,255,0.3)] animate-fadeIn",
            className,
        )}
    >
        {#each items as item}
            <button
                on:click={() => {
                    open = false;
                    // Dispatch event
                }}
                class="relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-layer-2 hover:text-highlight focus:bg-layer-2"
            >
                {#if item.icon}
                    <span class="mr-2 text-base">{item.icon}</span>
                {/if}
                <span>{item.label}</span>
            </button>
        {/each}
    </div>
{/if}
