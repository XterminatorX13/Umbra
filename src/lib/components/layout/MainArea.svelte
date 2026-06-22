<script>
    import { createEventDispatcher, onMount, onDestroy } from "svelte";
    import { getConvKey } from "$lib/utils";

    export let conversations = [];
    export let metadata = {};
    export let activeFolder = "__ALL__";
    export let folderMeta = {};
    export let activeId = null;

    const dispatch = createEventDispatcher();

    let currentView = "list";
    let searchQuery = "";
    let sortBy = "date"; // date, title, messages
    let sortOrder = "desc"; // asc, desc
    let showBulkActions = false;
    let selectedConvs = new Set();

    // Filtered conversations
    $: filtered = conversations.filter((c) => {
        const key = getConvKey(c);
        const meta = metadata[key] ?? {};
        if (meta.deleted) return false;

        if (activeFolder === "__ALL__") return true;
        if (activeFolder === "__FAV__") return !!meta.favorite;
        return meta.folder === activeFolder;
    });

    // Sorted conversations
    $: sorted = [...filtered].sort((a, b) => {
        let result = 0;
        if (sortBy === "date") {
            result = (a.createTime || 0) - (b.createTime || 0);
        } else if (sortBy === "title") {
            result = (a.title || "").localeCompare(b.title || "");
        } else if (sortBy === "messages") {
            result = a.messages.length - b.messages.length;
        }
        return sortOrder === "asc" ? result : -result;
    });

    // Search results
    $: searchResults = searchQuery.trim()
        ? conversations.flatMap((conv) => {
              const key = getConvKey(conv);
              return conv.messages
                  .filter((m) =>
                      m.textPlain
                          ?.toLowerCase()
                          .includes(searchQuery.toLowerCase()),
                  )
                  .map((m) => ({
                      convKey: key,
                      convTitle: conv.title || "(Sem título)",
                      role: m.role,
                      text: m.textPlain,
                      timestamp: m.timestamp,
                  }));
          })
        : [];

    function setView(view) {
        currentView = view;
        if (view !== "list") {
            showBulkActions = false;
            selectedConvs.clear();
        }
    }

    function selectConversation(key) {
        dispatch("select", { id: key });
    }

    function openInModal(key) {
        dispatch("openModal", { id: key });
    }

    function toggleSelection(key) {
        if (selectedConvs.has(key)) {
            selectedConvs.delete(key);
        } else {
            selectedConvs.add(key);
        }
        selectedConvs = selectedConvs;
    }

    function selectAll() {
        sorted.forEach((conv) => selectedConvs.add(getConvKey(conv)));
        selectedConvs = selectedConvs;
    }

    function clearSelection() {
        selectedConvs.clear();
        selectedConvs = selectedConvs;
    }

    function bulkFavorite() {
        selectedConvs.forEach((key) => {
            dispatch("bulkFavorite", { id: key });
        });
        clearSelection();
    }

    function bulkMoveToFolder() {
        const folder = prompt("Mover conversas selecionadas para pasta:");
        if (!folder) return;
        selectedConvs.forEach((key) => {
            dispatch("bulkMove", { id: key, folder: folder.trim() });
        });
        clearSelection();
    }

    function bulkDelete() {
        if (!confirm(`Deletar ${selectedConvs.size} conversas?`)) return;
        selectedConvs.forEach((key) => {
            dispatch("bulkDelete", { id: key });
        });
        clearSelection();
    }

    function bulkExport() {
        const selected = [...selectedConvs]
            .map((key) => conversations.find((c) => getConvKey(c) === key))
            .filter(Boolean);

        const blob = new Blob([JSON.stringify(selected, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `conversations-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        clearSelection();
    }

    function epochToString(epoch) {
        if (!epoch) return "";
        const ms = epoch < 2000000000 ? epoch * 1000 : epoch;
        return new Date(ms).toLocaleDateString();
    }

    function getFolderMeta(name) {
        return folderMeta[name] || { icon: "📁", color: "#2A2A2A" };
    }

    function makeHighlightedSnippet(text, query) {
        const lower = text.toLowerCase();
        const idx = lower.indexOf(query.toLowerCase());
        if (idx === -1) {
            return text.slice(0, 160) + (text.length > 160 ? "…" : "");
        }
        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + query.length + 40);
        let snippet =
            (start > 0 ? "…" : "") +
            text.slice(start, end) +
            (end < text.length ? "…" : "");

        return snippet.replace(
            new RegExp(`(${query})`, "ig"),
            '<mark style="background: var(--highlight); color: #000; padding: 2px 4px; border-radius: 3px;">$1</mark>',
        );
    }

    // Hotkeys
    function handleKeydown(e) {
        // Ctrl/Cmd + K = Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
            e.preventDefault();
            document.querySelector('input[placeholder*="Buscar"]')?.focus();
        }
        // Ctrl/Cmd + 1/2/3 = Switch view
        if ((e.ctrlKey || e.metaKey) && ["1", "2", "3"].includes(e.key)) {
            e.preventDefault();
            const views = ["list", "gallery", "search"];
            setView(views[parseInt(e.key) - 1]);
        }
        // Ctrl/Cmd + A = Select all (in list view)
        if (
            (e.ctrlKey || e.metaKey) &&
            e.key === "a" &&
            currentView === "list" &&
            showBulkActions
        ) {
            e.preventDefault();
            selectAll();
        }
        // Escape = Clear selection
        if (e.key === "Escape" && selectedConvs.size > 0) {
            e.preventDefault();
            clearSelection();
        }
    }

    onMount(() => {
        window.addEventListener("keydown", handleKeydown);
    });

    onDestroy(() => {
        window.removeEventListener("keydown", handleKeydown);
    });
</script>

<div style="display: flex; flex-direction: column; overflow: hidden;">
    <!-- Topbar -->
    <div
        style="background: var(--bg-panel); border-bottom: 1px solid var(--border); padding: 12px 16px; display: flex; gap: 10px; align-items: center;"
    >
        <div style="flex: 1;">
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="🔍 Buscar... (Ctrl+K)"
                style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: var(--radius); border: 1px solid var(--border-light); background: var(--layer-1); color: var(--color-text-primary); transition: all 0.2s;"
                on:focus={(e) =>
                    (e.target.style.borderColor = "var(--highlight)")}
                on:blur={(e) =>
                    (e.target.style.borderColor = "var(--border-light)")}
            />
        </div>

        <div style="display: flex; gap: 8px;">
            <button
                on:click={() => setView("list")}
                title="Lista (Ctrl+1)"
                style="background: {currentView === 'list'
                    ? 'var(--accent-1)'
                    : 'var(--layer-2)'}; border: 1px solid var(--border-light); color: {currentView ===
                'list'
                    ? '#fff'
                    : 'var(--color-text-secondary)'}; font-size: 12px; padding: 6px 12px; border-radius: var(--radius-small); cursor: pointer; transition: all 0.2s; box-shadow: {currentView ===
                'list'
                    ? '0 0 12px rgba(217, 111, 255, 0.3)'
                    : 'none'};"
            >
                📋 Lista
            </button>
            <button
                on:click={() => setView("gallery")}
                title="Galeria (Ctrl+2)"
                style="background: {currentView === 'gallery'
                    ? 'var(--accent-1)'
                    : 'var(--layer-2)'}; border: 1px solid var(--border-light); color: {currentView ===
                'gallery'
                    ? '#fff'
                    : 'var(--color-text-secondary)'}; font-size: 12px; padding: 6px 12px; border-radius: var(--radius-small); cursor: pointer; transition: all 0.2s; box-shadow: {currentView ===
                'gallery'
                    ? '0 0 12px rgba(217, 111, 255, 0.3)'
                    : 'none'};"
            >
                🎨 Galeria
            </button>
            <button
                on:click={() => setView("search")}
                title="Busca (Ctrl+3)"
                style="background: {currentView === 'search'
                    ? 'var(--accent-1)'
                    : 'var(--layer-2)'}; border: 1px solid var(--border-light); color: {currentView ===
                'search'
                    ? '#fff'
                    : 'var(--color-text-secondary)'}; font-size: 12px; padding: 6px 12px; border-radius: var(--radius-small); cursor: pointer; transition: all 0.2s; box-shadow: {currentView ===
                'search'
                    ? '0 0 12px rgba(217, 111, 255, 0.3)'
                    : 'none'};"
            >
                🔍 Busca
            </button>
        </div>
    </div>

    <!-- Toolbar (sort + bulk actions) -->
    {#if currentView === "list"}
        <div
            style="padding: 8px 16px; border-bottom: 1px solid var(--border); background: var(--bg-deep); display: flex; align-items: center; gap: 12px; flex-wrap: wrap;"
        >
            <div style="display: flex; gap: 6px; align-items: center;">
                <span
                    style="font-size: 11px; color: var(--color-text-secondary);"
                    >Ordenar:</span
                >
                <select
                    bind:value={sortBy}
                    style="padding: 4px 8px; font-size: 11px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-1); color: var(--color-text-primary); cursor: pointer;"
                >
                    <option value="date">Data</option>
                    <option value="title">Título</option>
                    <option value="messages">Mensagens</option>
                </select>
                <button
                    on:click={() =>
                        (sortOrder = sortOrder === "asc" ? "desc" : "asc")}
                    style="padding: 4px 8px; font-size: 11px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-1); color: var(--color-text-primary); cursor: pointer;"
                >
                    {sortOrder === "asc" ? "↑" : "↓"}
                </button>
            </div>

            <button
                on:click={() => (showBulkActions = !showBulkActions)}
                style="padding: 4px 10px; font-size: 11px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: {showBulkActions
                    ? 'var(--accent-2)'
                    : 'var(--layer-2)'}; color: {showBulkActions
                    ? '#fff'
                    : 'var(--color-text-secondary)'}; cursor: pointer; transition: all 0.2s;"
            >
                ☑️ Seleção {showBulkActions ? "✓" : ""}
            </button>

            {#if showBulkActions && selectedConvs.size > 0}
                <div style="display: flex; gap: 4px; animation: slideIn 0.2s;">
                    <span
                        style="font-size: 11px; color: var(--highlight); padding: 4px 8px;"
                        >{selectedConvs.size} selecionadas</span
                    >
                    <button
                        on:click={bulkFavorite}
                        style="padding: 4px 8px; font-size: 10px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: var(--color-text-primary); cursor: pointer;"
                        >⭐ Favoritar</button
                    >
                    <button
                        on:click={bulkMoveToFolder}
                        style="padding: 4px 8px; font-size: 10px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: var(--color-text-primary); cursor: pointer;"
                        >📁 Mover</button
                    >
                    <button
                        on:click={bulkExport}
                        style="padding: 4px 8px; font-size: 10px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: var(--color-text-primary); cursor: pointer;"
                        >💾 Exportar</button
                    >
                    <button
                        on:click={bulkDelete}
                        style="padding: 4px 8px; font-size: 10px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: #ff6b6b; cursor: pointer;"
                        >🗑️ Deletar</button
                    >
                    <button
                        on:click={clearSelection}
                        style="padding: 4px 8px; font-size: 10px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: var(--color-text-secondary); cursor: pointer;"
                        >✕</button
                    >
                </div>
            {/if}
        </div>
    {/if}

    <!-- Main scroll area -->
    <div style="flex: 1; overflow-y: auto; padding: 16px;">
        <!-- LIST VIEW -->
        {#if currentView === "list"}
            <div style="display: flex; flex-direction: column; gap: 10px;">
                {#each sorted as conv, idx}
                    {@const key = getConvKey(conv)}
                    {@const meta = metadata[key] ?? {}}
                    {@const isSelected = selectedConvs.has(key)}
                    {@const isActive = activeId === key}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        on:click={() =>
                            showBulkActions
                                ? toggleSelection(key)
                                : selectConversation(key)}
                        class="conv-card"
                        style="padding: 14px 16px; background: {isActive
                            ? 'var(--accent-1)'
                            : isSelected
                              ? 'var(--layer-3)'
                              : 'var(--layer-1)'}; border-radius: var(--radius); border: 2px solid {isActive
                            ? 'var(--highlight)'
                            : isSelected
                              ? 'var(--accent-2)'
                              : 'var(--border)'}; cursor: pointer; transition: all 0.2s; box-shadow: {isActive
                            ? '0 0 20px rgba(217, 111, 255, 0.4)'
                            : 'none'}; animation: fadeIn 0.2s {idx *
                            0.03}s backwards;"
                    >
                        <div
                            style="display: flex; align-items: start; gap: 10px;"
                        >
                            {#if showBulkActions}
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    style="margin-top: 2px; accent-color: var(--highlight);"
                                    on:click|stopPropagation={() =>
                                        toggleSelection(key)}
                                />
                            {/if}
                            <div style="flex: 1; min-width: 0;">
                                <div
                                    style="font-size: 14px; font-weight: 600; margin-bottom: 6px; color: {isActive
                                        ? '#fff'
                                        : 'var(--color-text-primary)'};"
                                >
                                    {conv.title || "(Sem título)"}
                                </div>
                                <div
                                    style="font-size: 11px; color: {isActive
                                        ? 'rgba(255,255,255,0.7)'
                                        : 'var(--color-text-secondary)'}; display: flex; gap: 8px; flex-wrap: wrap;"
                                >
                                    <span
                                        >📅 {epochToString(
                                            conv.createTime,
                                        )}</span
                                    >
                                    <span>💬 {conv.messages.length} msgs</span>
                                    {#if meta.folder}<span
                                            >📁 {meta.folder}</span
                                        >{/if}
                                    {#if meta.favorite}<span
                                            style="color: var(--highlight);"
                                            >★ Favorito</span
                                        >{/if}
                                </div>
                                {#if meta.tags?.length}
                                    <div
                                        style="margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;"
                                    >
                                        {#each meta.tags as tag}
                                            <span
                                                style="font-size: 10px; padding: 2px 6px; border-radius: 999px; background: var(--accent-2); color: #fff;"
                                                >#{tag}</span
                                            >
                                        {/each}
                                    </div>
                                {/if}
                                {#if meta.notes}
                                    <div
                                        style="margin-top: 6px; font-size: 11px; color: {isActive
                                            ? 'rgba(255,255,255,0.6)'
                                            : 'var(--color-text-secondary)'}; font-style: italic;"
                                    >
                                        📝 Tem notas
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
                {#if sorted.length === 0}
                    <div
                        style="text-align: center; padding: 40px; color: var(--color-text-secondary);"
                    >
                        <div style="font-size: 48px; opacity: 0.3;">📭</div>
                        <div style="margin-top: 16px;">
                            Nenhuma conversa encontrada.
                        </div>
                    </div>
                {/if}
            </div>

            <!-- GALLERY VIEW -->
        {:else if currentView === "gallery"}
            <div
                style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;"
            >
                {#each sorted as conv, idx}
                    {@const key = getConvKey(conv)}
                    {@const meta = metadata[key] ?? {}}
                    {@const fm = meta.folder
                        ? getFolderMeta(meta.folder)
                        : { icon: "💬", color: "#2A2A2A" }}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        on:click={() => openInModal(key)}
                        class="gallery-card"
                        style="background: var(--layer-1); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; cursor: pointer; display: flex; flex-direction: column; gap: 10px; transition: all 0.25s; animation: fadeIn 0.3s {idx *
                            0.04}s backwards;"
                    >
                        <div
                            style="display: flex; align-items: center; gap: 10px;"
                        >
                            <div
                                style="font-size: 28px; filter: drop-shadow(0 0 8px {fm.color}80);"
                            >
                                {fm.icon}
                            </div>
                            {#if meta.folder}
                                <div
                                    style="font-size: 9px; padding: 3px 8px; border-radius: 999px; background: {fm.color}; color: #fff; font-weight: 600;"
                                >
                                    {meta.folder}
                                </div>
                            {/if}
                            {#if meta.favorite}
                                <div
                                    style="font-size: 16px; color: var(--highlight);"
                                >
                                    ★
                                </div>
                            {/if}
                        </div>
                        <div
                            style="font-size: 14px; font-weight: 600; color: var(--color-text-primary); line-height: 1.3;"
                        >
                            {conv.title || "(Sem título)"}
                        </div>
                        <div
                            style="font-size: 11px; color: var(--color-text-secondary); line-height: 1.5; max-height: 60px; overflow: hidden;"
                        >
                            {conv.preview || ""}
                        </div>
                        <div
                            style="font-size: 10px; color: var(--color-text-secondary); display: flex; gap: 8px; margin-top: auto;"
                        >
                            <span>💬 {conv.messages.length}</span>
                            <span>📅 {epochToString(conv.createTime)}</span>
                        </div>
                    </div>
                {/each}
                {#if sorted.length === 0}
                    <div
                        style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-secondary);"
                    >
                        <div style="font-size: 48px; opacity: 0.3;">📭</div>
                        <div style="margin-top: 16px;">
                            Nenhuma conversa encontrada.
                        </div>
                    </div>
                {/if}
            </div>

            <!-- SEARCH VIEW -->
        {:else if currentView === "search"}
            <div style="display: flex; flex-direction: column; gap: 16px;">
                {#if !searchQuery.trim()}
                    <div
                        style="text-align: center; padding: 60px 20px; color: var(--color-text-secondary);"
                    >
                        <div style="font-size: 64px; opacity: 0.2;">🔍</div>
                        <div style="margin-top: 16px; font-size: 16px;">
                            Digite um termo de busca acima para ver resultados.
                        </div>
                        <div style="margin-top: 8px; font-size: 12px;">
                            Dica: Use Ctrl+K para focar no campo de busca
                        </div>
                    </div>
                {:else if searchResults.length === 0}
                    <div
                        style="text-align: center; padding: 60px 20px; color: var(--color-text-secondary);"
                    >
                        <div style="font-size: 64px; opacity: 0.2;">😕</div>
                        <div style="margin-top: 16px; font-size: 16px;">
                            Nenhum resultado encontrado para "{searchQuery}"
                        </div>
                    </div>
                {:else}
                    <div
                        style="padding: 12px; background: var(--bg-panel); border-radius: var(--radius); border: 1px solid var(--border);"
                    >
                        <strong style="color: var(--highlight);"
                            >{searchResults.length}</strong
                        > resultados encontrados
                    </div>
                    {#each searchResults.slice(0, 100) as result, idx}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div
                            on:click={() => openInModal(result.convKey)}
                            class="search-result"
                            style="padding: 16px; background: var(--layer-1); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.2s; animation: fadeIn 0.2s {idx *
                                0.03}s backwards;"
                        >
                            <div
                                style="font-size: 15px; font-weight: 600; color: var(--highlight); margin-bottom: 6px;"
                            >
                                {result.convTitle}
                            </div>
                            <div
                                style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 8px; display: flex; gap: 8px;"
                            >
                                <span
                                    style="text-transform: uppercase; font-weight: 600;"
                                    >{result.role === "assistant"
                                        ? "🤖 ChatGPT"
                                        : "👤 " + result.role}</span
                                >
                                <span>·</span>
                                <span>{epochToString(result.timestamp)}</span>
                            </div>
                            <div
                                style="font-size: 13px; color: var(--color-text-primary); line-height: 1.6;"
                            >
                                {@html makeHighlightedSnippet(
                                    result.text,
                                    searchQuery,
                                )}
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(-10px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .conv-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(217, 111, 255, 0.2) !important;
    }

    .gallery-card:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 8px 30px rgba(217, 111, 255, 0.3);
        border-color: var(--highlight);
    }

    .search-result:hover {
        background: var(--layer-2);
        border-color: var(--highlight);
        box-shadow: 0 4px 20px rgba(217, 111, 255, 0.2);
    }

    button:hover {
        transform: scale(1.05);
    }

    select:hover {
        border-color: var(--highlight);
    }
</style>
