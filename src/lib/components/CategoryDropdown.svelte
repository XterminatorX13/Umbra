<script>
    import { createEventDispatcher } from "svelte";
    import { getConvKey } from "../utils.js";
    import PlatformBadge from "./PlatformBadge.svelte";

    export let title = "";
    export let icon = "📁";
    export let conversations = [];
    export let metadata = {};
    export let activeId = null;
    export let defaultOpen = false;

    const dispatch = createEventDispatcher();

    let isOpen = defaultOpen;

    function toggle() {
        isOpen = !isOpen;
    }

    function select(key) {
        dispatch("select", { id: key });
    }
</script>

<div style="margin: 4px 8px;">
    <!-- Header com toggle -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        on:click={toggle}
        style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; background: var(--layer-2); border-radius: var(--radius-small); border: 1px solid var(--border-light); transition: all 0.2s;"
    >
        <span
            style="font-size: 11px; color: var(--color-text-secondary); width: 12px;"
            >{isOpen ? "▼" : "▶"}</span
        >
        <span style="font-size: 14px;">{icon}</span>
        <span
            style="font-size: 13px; color: var(--color-text-primary); flex: 1;"
            >{title}</span
        >
        <span
            style="font-size: 11px; padding: 2px 8px; background: var(--bg-deep); border-radius: 10px; color: var(--color-text-secondary);"
            >{conversations.length}</span
        >
    </div>

    <!-- Lista de conversas -->
    {#if isOpen && conversations.length > 0}
        <div
            style="margin-top: 4px; margin-left: 12px; max-height: 300px; overflow-y: auto;"
        >
            {#each conversations as conv}
                {@const key = getConvKey(conv)}
                {@const meta = metadata[key] ?? {}}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                    on:click={() => select(key)}
                    class="conv-row"
                    style="padding: 8px; margin: 2px 0; cursor: pointer; background: {activeId ===
                    key
                        ? 'var(--accent-1)'
                        : 'var(--bg-deep)'}; border-radius: var(--radius-small); border: 1px solid {activeId ===
                    key
                        ? 'var(--highlight)'
                        : 'transparent'}; transition: all 0.15s;"
                >
                    <div
                        style="font-size: 11px; font-weight: 500; color: {activeId ===
                        key
                            ? '#fff'
                            : 'var(--color-text-primary)'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                    >
                        {conv.title || "(Sem título)"}
                    </div>
                    <div
                        style="font-size: 9px; color: {activeId === key
                            ? 'rgba(255,255,255,0.7)'
                            : 'var(--color-text-secondary)'}; margin-top: 2px; display: flex; align-items: center; gap: 6px;"
                    >
                        <PlatformBadge platform={conv.platform || 'chatgpt'} size={10} showTooltip={false} />
                        <span>💬 {conv.messages.length}</span>
                        {#if meta.favorite}<span
                                style="color: var(--highlight);">★</span
                            >{/if}
                        {#if meta.folder}<span>📁 {meta.folder}</span>{/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    {#if isOpen && conversations.length === 0}
        <div
            style="padding: 12px; margin-left: 12px; text-align: center; font-size: 10px; color: var(--color-text-secondary);"
        >
            Nenhuma conversa
        </div>
    {/if}
</div>

<style>
    .conv-row:hover {
        transform: translateX(3px);
        border-color: var(--highlight) !important;
    }
</style>
