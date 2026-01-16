<script>
    import { createEventDispatcher } from "svelte";
    import { getConvKey, formatDate } from "../../utils/data.js";
    import BorderBeam from "../ui/BorderBeam.svelte";
    import VirtualList from "../layout/VirtualList.svelte";

    export let title = "";
    export let icon = "📁";
    export let conversations = [];
    export let metadata = {};
    export let activeId = null;
    export let defaultOpen = false;
    export let getSnippet = null; // Function to get search snippet for a conversation
    export let searchTerm = ""; // Current search term for highlighting
    export let folders = []; // List of available folders for context menu

    const dispatch = createEventDispatcher();

    let isOpen = defaultOpen;

    // Context Menu State
    let contextMenu = {
        isOpen: false,
        x: 0,
        y: 0,
        convId: null,
    };

    // Drag and Drop State
    let isDragging = false;

    function toggle() {
        isOpen = !isOpen;
    }

    function select(key) {
        dispatch("select", { id: key });
    }

    /* --- Context Menu --- */
    function openContextMenu(e, convId) {
        e.preventDefault();
        e.stopPropagation();

        // Adjust position to not overflow screen
        const x = Math.min(e.clientX, window.innerWidth - 200);
        const y = Math.min(e.clientY, window.innerHeight - 300);

        contextMenu = {
            isOpen: true,
            x,
            y,
            convId,
        };

        // Close menu when clicking outside
        document.addEventListener("click", closeContextMenu);
    }

    function closeContextMenu() {
        contextMenu.isOpen = false;
        document.removeEventListener("click", closeContextMenu);
    }

    function handleAction(action, payload = {}) {
        if (!contextMenu.convId) return;

        dispatch("action", {
            type: action,
            id: contextMenu.convId,
            ...payload,
        });

        closeContextMenu();
    }

    /* --- Drag and Drop --- */
    function handleDragStart(e, convId) {
        e.dataTransfer.setData("text/plain", convId);
        e.dataTransfer.effectAllowed = "move";
        isDragging = true;
    }

    function handleDragEnd() {
        isDragging = false;
    }

    // Virtual List Reference
    let virtualList;

    export function scrollToIndex(index) {
        // 64 is the itemHeight used in markup
        if (virtualList) virtualList.scrollTo(index * 64);
    }

    // Highlight search term in snippet
    function highlightSnippet(text, term) {
        if (!term || !text) return text;
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(${escaped})`, "gi");
        return text.replace(
            regex,
            '<mark style="background: var(--highlight); color: #fff; padding: 0 2px; border-radius: 2px;">$1</mark>',
        );
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

    <!-- Lista de conversas com Virtual Scrolling -->
    {#if isOpen && conversations.length > 0}
        <div
            class="conversation-list custom-scrollbar"
            style="height: 65vh; display: flex; flex-direction: column;"
        >
            <VirtualList
                items={conversations}
                itemHeight={64}
                let:visibleItems
                bind:this={virtualList}
            >
                {#each visibleItems as conv (getConvKey(conv))}
                    {@const key = getConvKey(conv)}
                    {@const meta = metadata[key] ?? {}}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        on:click={() => select(key)}
                        class="conv-row"
                        class:active={activeId === key}
                        draggable="true"
                        on:dragstart={(e) => handleDragStart(e, key)}
                        on:dragend={handleDragEnd}
                        on:contextmenu={(e) => openContextMenu(e, key)}
                    >
                        <div class="conv-content-wrapper">
                            <div class="conv-title">
                                {conv.title || "(Sem título)"}
                            </div>

                            <div class="conv-meta">
                                <span>💬 {conv.messages.length}</span>
                                {#if conv.createTime}
                                    <span style="opacity:0.6"
                                        >• {formatDate(conv.createTime)}</span
                                    >
                                {/if}
                                {#if meta.favorite}<span class="fav-icon"
                                        >★</span
                                    >{/if}
                                {#if meta.folder}<span>📁 {meta.folder}</span
                                    >{/if}
                            </div>

                            {#if getSnippet}
                                {@const snippet = getSnippet(key)}
                                {#if snippet}
                                    <!-- Snippet fixed height to avoid layout shift in virtual list -->
                                    <div
                                        class="conv-snippet"
                                        style="height: 34px; overflow: hidden;"
                                    >
                                        {@html highlightSnippet(
                                            snippet,
                                            searchTerm,
                                        )}
                                    </div>
                                {/if}
                            {/if}
                        </div>

                        <!-- Context Menu Button -->
                        <button
                            class="context-btn"
                            on:click={(e) => openContextMenu(e, key)}
                            title="Opções"
                        >
                            ⋮
                        </button>

                        <!-- Active Glow Effect -->
                        {#if activeId === key}
                            <div class="active-glow"></div>
                        {/if}
                    </div>
                {/each}
            </VirtualList>
        </div>
    {/if}

    {#if isOpen && conversations.length === 0}
        <div class="empty-msg">
            {searchTerm ? "Nenhum resultado encontrado" : "Nenhuma conversa"}
        </div>
    {/if}

    <!-- Context Menu Portal/Overlay -->
    {#if contextMenu.isOpen}
        {@const meta = metadata[contextMenu.convId] || {}}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="context-menu"
            style="top: {contextMenu.y}px; left: {contextMenu.x}px;"
            on:click|stopPropagation
        >
            <button class="menu-item" on:click={() => handleAction("favorite")}>
                <span>{meta.favorite ? "★ Desfavoritar" : "☆ Favoritar"}</span>
            </button>

            <div class="menu-divider"></div>

            <div class="menu-label">Mover para...</div>
            <div class="submenu-container custom-scrollbar">
                <button
                    class="menu-item"
                    on:click={() => handleAction("move", { folder: null })}
                >
                    <span>🏠 Home (Sem pasta)</span>
                </button>
                {#each folders as folder}
                    <button
                        class="menu-item"
                        on:click={() => handleAction("move", { folder })}
                    >
                        <span>📁 {folder}</span>
                    </button>
                {/each}
            </div>

            <div class="menu-divider"></div>

            <button
                class="menu-item danger"
                on:click={() => handleAction("delete")}
            >
                <span>🗑️ Excluir</span>
            </button>
        </div>
    {/if}
</div>

<style>
    /* List Container */
    .conversation-list {
        margin-top: 4px;
        margin-left: 4px; /* Tighter align */
        max-height: 300px;
        overflow-y: auto;
        contain: content; /* Performance Boost */
        padding-right: 4px;
    }

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
        position: relative;
        overflow: hidden;
    }

    .category-header:hover {
        background: linear-gradient(135deg, var(--layer-3), var(--layer-2));
        border-color: rgba(157, 78, 221, 0.3);
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
    }

    .category-header::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.03),
            transparent
        );
        transform: translateX(-100%);
        transition: transform 0.5s;
    }

    .category-header:hover::after {
        transform: translateX(100%);
    }

    .category-header .chevron {
        font-size: 10px;
        color: var(--color-text-secondary);
        width: 14px;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .category-header.is-open .chevron {
        transform: rotate(90deg); /* Standard chevron rotation */
    }

    .category-header .icon {
        font-size: 16px;
        filter: drop-shadow(0 0 8px rgba(157, 78, 221, 0.2));
    }

    .category-header .title {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-primary);
        flex: 1;
        letter-spacing: -0.01em;
    }

    .category-header .count {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
        color: var(--color-text-secondary);
        border: 1px solid var(--border);
    }

    /* Conversation Row - Glass Cockpit Style */
    .conv-row {
        position: relative;
        padding: 8px 10px 8px 14px; /* Reduced right padding for button */
        margin: 2px 0;
        cursor: pointer;
        background: transparent;
        border-radius: var(--radius-small);
        border: 1px solid transparent; /* Reserve space */
        transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        overflow: visible; /* Allow context button to be visible */
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
    }

    .conv-content-wrapper {
        flex: 1;
        min-width: 0;
    }

    .conv-row:hover {
        background: rgba(255, 255, 255, 0.03);
    }

    /* Active State */
    .conv-row.active {
        background: linear-gradient(
            90deg,
            rgba(157, 78, 221, 0.15) 0%,
            transparent 100%
        );
        border-color: rgba(157, 78, 221, 0.3);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .active-glow {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: var(--highlight);
        box-shadow: 0 0 10px var(--highlight);
        border-radius: 0 4px 4px 0;
    }

    .conv-title {
        font-size: 13px;
        font-weight: 500;
        color: var(--color-text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        transition: color 0.2s;
    }

    .conv-row:hover .conv-title {
        color: var(--color-text-primary);
    }

    .conv-row.active .conv-title {
        color: #fff;
        font-weight: 600;
        text-shadow: 0 0 12px rgba(157, 78, 221, 0.5);
    }

    .conv-meta {
        font-size: 10px;
        color: var(--color-text-tertiary);
        margin-top: 4px;
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .conv-row.active .conv-meta {
        color: rgba(255, 255, 255, 0.6);
    }

    .fav-icon {
        color: var(--highlight);
        filter: drop-shadow(0 0 5px var(--highlight));
    }

    .conv-snippet {
        font-size: 10px;
        color: var(--color-text-secondary);
        margin-top: 6px;
        padding: 6px 8px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        border: 1px solid var(--border);
        line-height: 1.4;
    }

    .loading-indicator {
        padding: 12px;
        text-align: center;
        font-size: 10px;
        color: var(--color-text-tertiary);
        font-style: italic;
    }

    .empty-msg {
        padding: 20px;
        text-align: center;
        font-size: 11px;
        color: var(--color-text-tertiary);
        font-style: italic;
        background: rgba(255, 255, 255, 0.01);
        border-radius: var(--radius-small);
        margin-left: 12px;
        margin-top: 4px;
    }
    /* Context Menu Button */
    .context-btn {
        opacity: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        color: var(--color-text-tertiary);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 14px;
        flex-shrink: 0;
        margin-top: -2px;
    }

    .conv-row:hover .context-btn {
        opacity: 1;
    }

    .context-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--color-text-primary);
    }

    /* Context Menu Portal */
    .context-menu {
        position: fixed;
        z-index: 999999;
        background: var(--bg-panel);
        border: 1px solid var(--border-light);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        padding: 4px;
        min-width: 160px;
        animation: fadeIn 0.1s ease-out;
        backdrop-filter: blur(10px);
    }

    .menu-item {
        width: 100%;
        text-align: left;
        padding: 6px 10px;
        background: transparent;
        color: var(--color-text-primary);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background 0.2s;
    }

    .menu-item:hover {
        background: var(--layer-2);
    }

    .menu-item.danger {
        color: #ef4444;
    }

    .menu-item.danger:hover {
        background: rgba(239, 68, 68, 0.1);
    }

    .menu-divider {
        height: 1px;
        background: var(--border-light);
        margin: 4px 0;
    }

    .menu-label {
        font-size: 10px;
        color: var(--color-text-tertiary);
        padding: 4px 10px;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.05em;
    }

    .submenu-container {
        max-height: 150px;
        overflow-y: auto;
    }
</style>
