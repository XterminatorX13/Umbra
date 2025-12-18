<script>
    import { createEventDispatcher } from "svelte";
    import { getConvKey } from "../utils.js";
    import BorderBeam from "./BorderBeam.svelte";

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
    <!-- Header com toggle + BorderBeam animation -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <BorderBeam duration={2.5} size={150}>
        <div on:click={toggle} class="category-header" class:is-open={isOpen}>
            <span class="chevron">{isOpen ? "▼" : "▶"}</span>
            <span class="icon">{icon}</span>
            <span class="title">{title}</span>
            <span class="count">{conversations.length}</span>
        </div>
    </BorderBeam>

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
                            : 'var(--color-text-secondary)'}; margin-top: 2px; display: flex; gap: 6px;"
                    >
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
    /* Premium Category Header */
    .category-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        cursor: pointer;
        background: linear-gradient(135deg, var(--layer-2), var(--layer-1));
        border-radius: var(--radius-small);
        border: 1px solid var(--border-light);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .category-header:hover {
        background: linear-gradient(135deg, var(--layer-3), var(--layer-2));
        border-color: var(--border-focus);
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
    }

    .category-header .chevron {
        font-size: 10px;
        color: var(--color-text-secondary);
        width: 14px;
        transition: transform 0.3s ease;
    }

    .category-header.is-open .chevron {
        transform: rotate(0deg);
    }

    .category-header .icon {
        font-size: 16px;
    }

    .category-header .title {
        font-size: 13px;
        font-weight: 500;
        color: var(--color-text-primary);
        flex: 1;
    }

    .category-header .count {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        background: var(--bg-deep);
        border-radius: 12px;
        color: var(--color-text-secondary);
    }

    /* Conversation Row */
    .conv-row {
        padding: 8px 12px;
        margin: 4px 0;
        cursor: pointer;
        background: var(--bg-deep);
        border-radius: var(--radius-small);
        border: 1px solid transparent;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .conv-row:hover {
        background: var(--layer-1);
        border-color: var(--border-light);
        transform: translateX(4px);
    }
</style>
