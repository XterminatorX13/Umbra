<script lang="ts">
    import { writable } from "svelte/store";
    import { cn } from "../cn";

    export let toasts = writable<
        Array<{
            id: string;
            message: string;
            type: "success" | "error" | "info" | "warning";
        }>
    >([]);

    function removeToast(id: string) {
        toasts.update((t) => t.filter((toast) => toast.id !== id));
    }

    // Auto-remove after 5 seconds
    $: $toasts.forEach((toast) => {
        setTimeout(() => removeToast(toast.id), 5000);
    });
</script>

<!-- Toast Container -->
<div
    class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 max-w-md w-full pointer-events-none"
>
    {#each $toasts as toast (toast.id)}
        <div
            class={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md border shadow-2xl animate-fadeIn pointer-events-auto backdrop-blur-md transition-all",
                // Base style similar to GlitchButton variant-secondary
                "bg-[#1a1a1a]/90 text-slate-300 border-white/10",
                // Subtle status indicators
                toast.type === "success" &&
                    "border-green-500/30 text-green-100",
                toast.type === "error" && "border-red-500/30 text-red-100",
                toast.type === "warning" &&
                    "border-yellow-500/30 text-yellow-100",
                toast.type === "info" && "border-violet-500/30 text-violet-100",
            )}
            style="font-size: 12px; font-weight: 600; box-shadow: 0 4px 20px rgba(0,0,0,0.5);"
        >
            <!-- Icon -->
            <div class="text-sm opacity-80">
                {#if toast.type === "success"}✓{/if}
                {#if toast.type === "error"}✕{/if}
                {#if toast.type === "warning"}⚠{/if}
                {#if toast.type === "info"}ℹ{/if}
            </div>

            <!-- Message -->
            <div class="">
                {toast.message}
            </div>

            <!-- Close -->
            <button
                on:click={() => removeToast(toast.id)}
                class="ml-2 opacity-50 hover:opacity-100 transition-opacity"
            >
                ×
            </button>
        </div>
    {/each}
</div>
