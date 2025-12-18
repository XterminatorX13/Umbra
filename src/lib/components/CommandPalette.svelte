<script>
    import { createEventDispatcher, onMount, onDestroy } from "svelte";
    import {
        Search,
        Star,
        Folder,
        FileText,
        Command as CommandIcon,
    } from "lucide-svelte";

    export let conversations = [];

    const dispatch = createEventDispatcher();

    let isOpen = false;
    let query = "";
    let inputEl;
    let selectedIndex = 0;

    // Actions available in the palette
    const actions = [
        { id: "favorites", label: "Ver Favoritos", icon: "⭐", shortcut: "F" },
        { id: "all", label: "Ver Todas", icon: "📚", shortcut: "A" },
        { id: "new-folder", label: "Nova Pasta", icon: "📁", shortcut: "N" },
        { id: "stats", label: "Estatísticas", icon: "📊", shortcut: "S" },
    ];

    // Filter conversations by query
    $: filteredConversations = query.trim()
        ? conversations
              .filter((c) =>
                  c.title?.toLowerCase().includes(query.toLowerCase()),
              )
              .slice(0, 8)
        : [];

    // Combined results (actions first if no query, else conversations)
    $: results = query.trim()
        ? filteredConversations.map((c) => ({ type: "conv", ...c }))
        : actions.map((a) => ({ type: "action", ...a }));

    $: if (selectedIndex >= results.length)
        selectedIndex = Math.max(0, results.length - 1);

    function open() {
        isOpen = true;
        query = "";
        selectedIndex = 0;
        setTimeout(() => inputEl?.focus(), 50);
    }

    function close() {
        isOpen = false;
        query = "";
    }

    function handleKeydown(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
            e.preventDefault();
            isOpen ? close() : open();
        }

        if (!isOpen) return;

        if (e.key === "Escape") {
            e.preventDefault();
            close();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
        } else if (e.key === "Enter") {
            e.preventDefault();
            selectItem(results[selectedIndex]);
        }
    }

    function selectItem(item) {
        if (!item) return;

        if (item.type === "conv") {
            dispatch("select", { id: item.id });
        } else if (item.type === "action") {
            dispatch("action", { action: item.id });
        }
        close();
    }

    onMount(() => {
        window.addEventListener("keydown", handleKeydown);
    });

    onDestroy(() => {
        window.removeEventListener("keydown", handleKeydown);
    });
</script>

{#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="overlay" on:click={close}>
        <div class="palette" on:click|stopPropagation>
            <!-- Search Input -->
            <div class="search-box">
                <Search size={18} />
                <input
                    bind:this={inputEl}
                    bind:value={query}
                    type="text"
                    placeholder="Buscar conversas ou ações..."
                    autocomplete="off"
                />
                <kbd>ESC</kbd>
            </div>

            <!-- Results -->
            <div class="results">
                {#if results.length === 0}
                    <div class="empty">Nenhum resultado encontrado</div>
                {:else}
                    {#each results as item, i}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div
                            class="result-item"
                            class:selected={i === selectedIndex}
                            on:click={() => selectItem(item)}
                            on:mouseenter={() => (selectedIndex = i)}
                        >
                            <span class="icon">
                                {#if item.type === "conv"}
                                    💬
                                {:else}
                                    {item.icon}
                                {/if}
                            </span>
                            <span class="label">
                                {item.type === "conv" ? item.title : item.label}
                            </span>
                            {#if item.shortcut}
                                <kbd>{item.shortcut}</kbd>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>

            <!-- Footer Hint -->
            <div class="footer">
                <span>↑↓ Navegar</span>
                <span>↵ Selecionar</span>
                <span>ESC Fechar</span>
            </div>
        </div>
    </div>
{/if}

<style>
    .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 15vh;
        z-index: 9999;
        animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .palette {
        width: 100%;
        max-width: 560px;
        background: var(--bg-panel);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-large);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
        overflow: hidden;
        animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-20px) scale(0.98);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .search-box {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border);
        color: var(--color-text-secondary);
    }

    .search-box input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: 16px;
        color: var(--color-text-primary);
    }

    .search-box input::placeholder {
        color: var(--color-text-tertiary);
    }

    .search-box kbd {
        padding: 4px 8px;
        font-size: 11px;
        background: var(--layer-2);
        border-radius: 4px;
        color: var(--color-text-tertiary);
    }

    .results {
        max-height: 320px;
        overflow-y: auto;
        padding: 8px;
    }

    .result-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: var(--radius-small);
        cursor: pointer;
        transition: all 0.1s;
    }

    .result-item:hover,
    .result-item.selected {
        background: var(--layer-2);
    }

    .result-item.selected {
        background: var(--accent-1);
    }

    .result-item .icon {
        font-size: 18px;
        width: 24px;
        text-align: center;
    }

    .result-item .label {
        flex: 1;
        font-size: 14px;
        color: var(--color-text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .result-item kbd {
        padding: 3px 6px;
        font-size: 10px;
        background: var(--bg-deep);
        border-radius: 4px;
        color: var(--color-text-tertiary);
    }

    .empty {
        text-align: center;
        padding: 24px;
        color: var(--color-text-tertiary);
        font-size: 13px;
    }

    .footer {
        display: flex;
        justify-content: center;
        gap: 24px;
        padding: 12px;
        border-top: 1px solid var(--border);
        font-size: 11px;
        color: var(--color-text-tertiary);
    }
</style>
