<script>
    import { createEventDispatcher, onMount, onDestroy } from "svelte";
    import { getConvKey } from "../utils/data.js";
    import { addToast } from "../stores/index.js";
    import CategoryDropdown from "../components/features/CategoryDropdown.svelte";
    import InputModal from "../components/features/InputModal.svelte";
    import FilterPanel from "../components/features/FilterPanel.svelte";
    import BorderBeam from "../components/ui/BorderBeam.svelte";
    import IconPicker from "../components/features/IconPicker.svelte";
    import ColorPicker from "../components/features/ColorPicker.svelte";

    export let conversations = [];
    export let metadata = {};
    export let activeId = null;

    const dispatch = createEventDispatcher();

    let activeFolder = "__ALL__";
    let openSections = { geral: true, pastas: true };
    let openCategories = {
        all: true,
        favorites: false,
        folders: {},
    };
    let showingStats = false;
    let searchTerm = "";
    let searchMode = "title"; // 'title' or 'content'
    let searchResults = []; // Stores { conversation, snippet } pairs for content search

    // Advanced filter state
    let showFilters = false;
    let advancedFilters = {
        models: [],
        hasImageGen: null,
        hasWebSearch: null,
        isDeepResearch: null,
        dateFrom: null,
        dateTo: null,
    };

    // Modal state for folder management
    let modalOpen = false;
    let modalTitle = "";
    let modalPlaceholder = "";
    let modalDefault = "";
    let modalStep = ""; // 'newFolderName', 'newFolderIcon', 'newFolderColor', 'editIcon', 'editColor'
    let pendingFolderName = "";
    let pendingFolderIcon = "";
    let editingFolderName = "";

    // Visual pickers state
    let iconPickerOpen = false;
    let colorPickerOpen = false;
    let pendingIcon = "📁";
    let pendingColor = "#7c3aed";

    // Folder metadata (icons & colors)
    const FOLDER_META_KEY = "pkm_folder_meta_v1";
    let folderMeta = {};

    try {
        const saved = localStorage.getItem(FOLDER_META_KEY);
        if (saved) folderMeta = JSON.parse(saved);
    } catch (e) {
        console.error("Error loading folder meta:", e);
    }

    function saveFolderMeta() {
        localStorage.setItem(FOLDER_META_KEY, JSON.stringify(folderMeta));
    }

    function randomFolderColor() {
        const palette = [
            "#4F1366",
            "#3B0E4F",
            "#5E1A72",
            "#7A1E8A",
            "#9D3BB0",
            "#C850C0",
            "#FF6EC7",
        ];
        return palette[Math.floor(Math.random() * palette.length)];
    }

    function getFolderMeta(name) {
        if (!folderMeta[name]) {
            folderMeta[name] = {
                icon: "📁",
                color: randomFolderColor(),
            };
            folderMeta = { ...folderMeta };
            saveFolderMeta();
        }
        return folderMeta[name];
    }

    // Get all unique folders (Used + Explicitly Created)
    $: foldersSet = new Set([
        ...Object.keys(folderMeta),
        ...conversations
            .map((c) => metadata[getConvKey(c)]?.folder)
            .filter(Boolean),
    ]);
    $: folders = Array.from(foldersSet).sort();

    // Advanced filter computed properties
    $: hasActiveAdvancedFilters =
        advancedFilters.models.length > 0 ||
        advancedFilters.hasImageGen ||
        advancedFilters.hasWebSearch ||
        advancedFilters.isDeepResearch ||
        advancedFilters.isReasoning ||
        advancedFilters.hasCanvas ||
        advancedFilters.hasCode ||
        advancedFilters.dateFrom ||
        advancedFilters.dateTo;

    $: activeAdvancedFilterCount =
        advancedFilters.models.length +
        (advancedFilters.hasImageGen ? 1 : 0) +
        (advancedFilters.hasWebSearch ? 1 : 0) +
        (advancedFilters.isDeepResearch ? 1 : 0) +
        (advancedFilters.isReasoning ? 1 : 0) +
        (advancedFilters.hasCanvas ? 1 : 0) +
        (advancedFilters.hasCode ? 1 : 0) +
        (advancedFilters.dateFrom || advancedFilters.dateTo ? 1 : 0);

    // Apply advanced filters to a conversation
    function passesAdvancedFilters(conv) {
        const fm = conv.filterMeta;
        if (!fm) return true; // No filter metadata, pass through

        // Model filter
        if (advancedFilters.models.length > 0) {
            if (!advancedFilters.models.includes(fm.modelSlug)) return false;
        }

        // Feature filters
        if (advancedFilters.hasImageGen && !fm.hasImageGen) return false;
        if (advancedFilters.hasWebSearch && !fm.hasWebSearch) return false;
        if (advancedFilters.isDeepResearch && !fm.isDeepResearch) return false;
        if (advancedFilters.isReasoning && !fm.isReasoning) return false;

        // Date filters
        if (advancedFilters.dateFrom && fm.createDate) {
            if (fm.createDate < advancedFilters.dateFrom) return false;
        }
        if (advancedFilters.dateTo && fm.createDate) {
            const endOfDay = new Date(advancedFilters.dateTo);
            endOfDay.setHours(23, 59, 59, 999);
            if (fm.createDate > endOfDay) return false;
        }

        return true;
    }

    // Filtered conversations with search AND advanced filters
    // Explicitly depend on advancedFilters for Svelte reactivity
    $: filtered = (() => {
        // Force reactivity on advancedFilters changes
        const {
            models,
            hasImageGen,
            hasWebSearch,
            isDeepResearch,
            isReasoning,
            hasCanvas,
            hasCode,
            dateFrom,
            dateTo,
        } = advancedFilters;

        // If content search and we have search results, use them
        if (
            searchMode === "content" &&
            searchTerm &&
            searchResults.length > 0
        ) {
            return searchResults
                .map((r) => r.conversation)
                .filter((c) => {
                    const fm = c.filterMeta;
                    if (!fm) return true;
                    if (models.length > 0 && !models.includes(fm.modelSlug))
                        return false;
                    if (hasImageGen && !fm.hasImageGen) return false;
                    if (hasWebSearch && !fm.hasWebSearch) return false;
                    if (isDeepResearch && !fm.isDeepResearch) return false;

                    if (isReasoning && !fm.isReasoning) return false;
                    if (hasCanvas && !fm.hasCanvas) return false;
                    if (hasCode && !fm.hasCode) return false;
                    if (dateFrom && fm.createDate && fm.createDate < dateFrom)
                        return false;
                    if (dateTo && fm.createDate) {
                        const endOfDay = new Date(dateTo);
                        endOfDay.setHours(23, 59, 59, 999);
                        if (fm.createDate > endOfDay) return false;
                    }
                    return true;
                });
        }

        // Standard title-based filtering + advanced filters
        return conversations.filter((c) => {
            const key = getConvKey(c);
            const meta = metadata[key] ?? {};
            if (meta.deleted) return false;

            // Apply advanced filters
            const fm = c.filterMeta;
            if (fm) {
                if (models.length > 0 && !models.includes(fm.modelSlug))
                    return false;
                if (hasImageGen && !fm.hasImageGen) return false;
                if (hasWebSearch && !fm.hasWebSearch) return false;
                if (isDeepResearch && !fm.isDeepResearch) return false;

                if (isReasoning && !fm.isReasoning) return false;
                if (hasCanvas && !fm.hasCanvas) return false;
                if (hasCode && !fm.hasCode) return false;
                if (dateFrom && fm.createDate && fm.createDate < dateFrom)
                    return false;
                if (dateTo && fm.createDate) {
                    const endOfDay = new Date(dateTo);
                    endOfDay.setHours(23, 59, 59, 999);
                    if (fm.createDate > endOfDay) return false;
                }
            }

            if (activeFolder === "__ALL__") {
                if (searchTerm && searchMode === "title") {
                    const q = searchTerm.toLowerCase();
                    return (c.title || "").toLowerCase().includes(q);
                }
                return true;
            }
            if (activeFolder === "__FAV__") return !!meta.favorite;
            return meta.folder === activeFolder;
        });
    })();

    // Get snippet for a conversation (used in content search)
    function getSnippetForConv(convId) {
        const result = searchResults.find(
            (r) => getConvKey(r.conversation) === convId,
        );
        return result?.snippet || null;
    }

    // Deep search in message content
    function performDeepSearch(query) {
        if (!query || query.length < 2) {
            searchResults = [];
            return;
        }

        const q = query.toLowerCase();
        const results = [];

        for (const conv of conversations) {
            const key = getConvKey(conv);
            const meta = metadata[key] ?? {};
            if (meta.deleted) continue;

            // Search through messages
            const messages = conv.messages || [];
            for (const msg of messages) {
                const text = msg.textPlain || msg.textMarkdown || "";
                const lowerText = text.toLowerCase();
                const idx = lowerText.indexOf(q);

                if (idx !== -1) {
                    // Extract snippet (40 chars before, 60 chars after)
                    const start = Math.max(0, idx - 40);
                    const end = Math.min(text.length, idx + query.length + 60);
                    let snippet = text.slice(start, end);

                    // Add ellipsis
                    if (start > 0) snippet = "..." + snippet;
                    if (end < text.length) snippet = snippet + "...";

                    results.push({
                        conversation: conv,
                        snippet,
                        matchIndex: idx,
                    });
                    break; // Only need first match per conversation
                }
            }
        }

        searchResults = results;
    }

    // Debounced deep search
    let searchTimeout = null;
    $: {
        if (searchMode === "content" && searchTerm) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(
                () => performDeepSearch(searchTerm),
                300,
            );
        } else {
            searchResults = [];
        }
    }

    // Stats
    $: stats = {
        total: conversations.filter((c) => !metadata[getConvKey(c)]?.deleted)
            .length,
        favorites: conversations.filter(
            (c) => metadata[getConvKey(c)]?.favorite,
        ).length,
        withNotes: conversations.filter((c) =>
            metadata[getConvKey(c)]?.notes?.trim(),
        ).length,
        folders: folders.length,
    };

    function setActiveFolder(folderId) {
        activeFolder = folderId;
        dispatch("folderChange", { folder: folderId });
    }

    function createNewFolder() {
        modalStep = "newFolderName";
        modalTitle = "Nome da nova pasta";
        modalPlaceholder = "Ex.: Trabalho";
        modalDefault = "";
        modalOpen = true;
    }

    function handleModalSubmit(event) {
        const value = event.detail.value;

        if (modalStep === "newFolderName") {
            if (!value) return;
            pendingFolderName = value;
            modalOpen = false;
            // Abrir IconPicker visual
            pendingIcon = "📁";
            iconPickerOpen = true;
        } else if (modalStep === "editIcon") {
            if (value !== null) {
                folderMeta[editingFolderName] = {
                    ...getFolderMeta(editingFolderName),
                    icon: value || "📁",
                };
            }
            modalStep = "editColor";
            modalTitle = `Cor para "${editingFolderName}"`;
            modalDefault = getFolderMeta(editingFolderName).color || "#4F1366";
            modalPlaceholder = "#hex";
            modalOpen = true;
        } else if (modalStep === "editColor") {
            if (value !== null) {
                folderMeta[editingFolderName] = {
                    ...getFolderMeta(editingFolderName),
                    color: value || "#4F1366",
                };
                folderMeta = { ...folderMeta };
                saveFolderMeta();
            }
            editingFolderName = "";
            modalOpen = false;
        }
    }

    function handleIconSelect(event) {
        pendingFolderIcon = event.detail.icon;
        pendingIcon = event.detail.icon;
        // Abrir ColorPicker visual
        pendingColor = randomFolderColor();
        colorPickerOpen = true;
    }

    function handleColorSelect(event) {
        const color = event.detail.color;
        // Criar pasta com nome, ícone e cor selecionados
        folderMeta[pendingFolderName] = { icon: pendingFolderIcon, color };
        folderMeta = { ...folderMeta };
        saveFolderMeta();
        pendingFolderName = "";
        pendingFolderIcon = "";
    }

    function editFolderSettings(name) {
        editingFolderName = name;
        const current = getFolderMeta(name);
        modalStep = "editIcon";
        modalTitle = `Ícone para "${name}"`;
        modalDefault = current.icon || "📁";
        modalPlaceholder = "emoji";
        modalOpen = true;
    }

    function deleteFolder(name) {
        if (
            !confirm(
                `Deletar pasta "${name}"? As conversas não serão deletadas, apenas movidas para "Todos".`,
            )
        )
            return;

        // Remove folder from all conversations
        let movedCount = 0;
        conversations.forEach((c) => {
            const key = getConvKey(c);
            if (metadata[key]?.folder === name) {
                delete metadata[key].folder;
                movedCount++;
            }
        });

        delete folderMeta[name];
        folderMeta = { ...folderMeta };
        saveFolderMeta();
        // Toast de confirmação
        addToast(
            `Pasta "${name}" excluída. ${movedCount} conversa(s) movida(s) para "Todos".`,
            "success",
        );
    }

    /* --- Context Menu Actions --- */
    function handleContextAction(event) {
        const { type, id, ...payload } = event.detail;

        if (type === "favorite") {
            // Don't mutate metadata prop - let App handle it
            const currentFav = metadata[id]?.favorite || false;
            dispatch("updateMeta", { id, favorite: !currentFav });
        } else if (type === "delete") {
            if (confirm("Excluir esta conversa?")) {
                dispatch("delete", { id });
            }
        } else if (type === "move") {
            const folder = payload.folder;
            // Don't mutate metadata prop - let App handle it
            dispatch("updateMeta", { id, folder });

            addToast(
                folder ? `Movido para "${folder}"` : "Removido da pasta",
                "success",
            );
        }
    }

    /* --- Drag and Drop --- */
    let dragOverFolder = null;

    function handleDragOver(e, folderName) {
        e.preventDefault();
        dragOverFolder = folderName;
        // console.log("DragOver:", folderName);
    }

    function handleDragLeave(e) {
        dragOverFolder = null;
    }

    function handleDrop(e, folderName) {
        e.preventDefault();
        dragOverFolder = null;
        const convId = e.dataTransfer.getData("text/plain");

        if (convId) {
            const currentFolder = metadata[convId]?.folder;
            if (currentFolder !== folderName) {
                handleContextAction({
                    detail: {
                        type: "move",
                        id: convId,
                        folder: folderName,
                    },
                });
            }
        }
    }

    function toggleSection(section) {
        openSections[section] = !openSections[section];
    }

    function toggleCategory(category, folderName = null) {
        if (folderName) {
            // Toggle specific folder
            if (openCategories.folders[folderName] === undefined) {
                openCategories.folders[folderName] = true;
            } else {
                openCategories.folders[folderName] =
                    !openCategories.folders[folderName];
            }
            openCategories = { ...openCategories };
        } else {
            // Toggle all/favorites
            openCategories[category] = !openCategories[category];
        }
    }

    function select(key) {
        dispatch("select", { id: key });
    }

    let scrollContainer;

    // Navigate to specific index
    function navigateToIndex(index) {
        if (index < 0 || index >= filtered.length) return;
        const key = getConvKey(filtered[index]);
        select(key);

        // Scroll into view
        if (scrollContainer) {
            const rows = scrollContainer.querySelectorAll(".conv-row");
            if (rows[index]) {
                rows[index].scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }
        }
    }

    // Hotkeys
    function handleKeydown(e) {
        // Navigation keys
        if (filtered.length > 0 && activeId) {
            const currentIndex = filtered.findIndex(
                (c) => getConvKey(c) === activeId,
            );

            if (e.key === "ArrowDown") {
                e.preventDefault();
                navigateToIndex(currentIndex + 1);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                navigateToIndex(currentIndex - 1);
            } else if (e.key === "PageDown") {
                e.preventDefault();
                navigateToIndex(
                    Math.min(filtered.length - 1, currentIndex + 10),
                );
            } else if (e.key === "PageUp") {
                e.preventDefault();
                navigateToIndex(Math.max(0, currentIndex - 10));
            } else if (e.key === "Home") {
                e.preventDefault();
                navigateToIndex(0);
            } else if (e.key === "End") {
                e.preventDefault();
                navigateToIndex(filtered.length - 1);
            }
        }

        // Ctrl/Cmd + Shift + F = Toggle favorites
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
            e.preventDefault();
            setActiveFolder(activeFolder === "__FAV__" ? "__ALL__" : "__FAV__");
        }
        // Ctrl/Cmd + Shift + S = Toggle stats
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
            e.preventDefault();
            showingStats = !showingStats;
        }
    }

    onMount(() => {
        window.addEventListener("keydown", handleKeydown);
    });

    onDestroy(() => {
        window.removeEventListener("keydown", handleKeydown);
    });
</script>

<aside
    class="glass"
    style="border-right: 1px solid var(--border-light); display: flex; flex-direction: column; overflow: visible; position: relative; z-index: 1001;"
>
    <!-- Header -->
    <div
        style="padding: 16px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px;"
    >
        <div
            style="display: flex; align-items: center; justify-content: space-between; gap: 8px;"
        >
            <span
                style="font-size: 14px; font-weight: 600; color: var(--highlight);"
                >Pastas & Categorias</span
            >
            <div style="display: flex; gap: 4px;">
                <button
                    on:click={createNewFolder}
                    title="Nova pasta (Ctrl+Shift+N)"
                    class="btn-premium"
                >
                    + Pasta
                </button>
                <button
                    on:click={() => (showingStats = !showingStats)}
                    title="Estatísticas (Ctrl+Shift+S)"
                    class="btn-premium"
                    class:active={showingStats}
                >
                    📊
                </button>
            </div>
        </div>

        <!-- Quick search with Filter -->
        <div class="search-container" style="position: relative;">
            <div class="search-row">
                <input
                    type="text"
                    bind:value={searchTerm}
                    placeholder={searchMode === "title"
                        ? "Buscar por título..."
                        : "Buscar no conteúdo..."}
                    class="sidebar-search-input"
                    spellcheck="false"
                />
                <button
                    class="filter-trigger"
                    class:active={showFilters || hasActiveAdvancedFilters}
                    on:click|stopPropagation={() =>
                        (showFilters = !showFilters)}
                    title="Filtros avançados"
                >
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <polygon
                            points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"
                        ></polygon>
                    </svg>
                    {#if activeAdvancedFilterCount > 0}
                        <span class="filter-badge"
                            >{activeAdvancedFilterCount}</span
                        >
                    {/if}
                </button>
            </div>

            <!-- Filter Panel Popover -->
            <FilterPanel
                {conversations}
                bind:filters={advancedFilters}
                isOpen={showFilters}
                on:change={(e) => (advancedFilters = { ...e.detail })}
                on:apply={(e) => {
                    advancedFilters = { ...e.detail };
                    showFilters = false;
                }}
                on:close={() => (showFilters = false)}
            />
        </div>

        <!-- Search mode toggle -->
        <div class="search-toggle" style="margin-top: 6px;">
            <button
                on:click={() => (searchMode = "title")}
                class="search-toggle-btn"
                class:active={searchMode === "title"}
            >
                Título
            </button>
            <button
                on:click={() => (searchMode = "content")}
                class="search-toggle-btn"
                class:active={searchMode === "content"}
            >
                Conteúdo
            </button>
        </div>

        <!-- Search results count -->
        {#if searchTerm && searchMode === "content"}
            <div
                style="font-size: 10px; color: var(--color-text-tertiary); margin-top: 4px;"
            >
                {searchResults.length} resultado{searchResults.length !== 1
                    ? "s"
                    : ""} encontrado{searchResults.length !== 1 ? "s" : ""}
            </div>
        {/if}
    </div>

    <!-- Stats Panel -->
    {#if showingStats}
        <div
            style="padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--bg-panel); font-size: 12px; animation: slideDown 0.2s;"
        >
            <div
                style="font-weight: 600; margin-bottom: 6px; color: var(--highlight);"
            >
                📊 Estatísticas
            </div>
            <div
                style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; color: var(--color-text-secondary);"
            >
                <div>
                    Total: <strong style="color: var(--color-text-primary);"
                        >{stats.total}</strong
                    >
                </div>
                <div>
                    Favoritos: <strong style="color: var(--highlight);"
                        >{stats.favorites}</strong
                    >
                </div>
                <div>
                    Com notas: <strong style="color: var(--color-text-primary);"
                        >{stats.withNotes}</strong
                    >
                </div>
                <div>
                    Pastas: <strong style="color: var(--color-text-primary);"
                        >{stats.folders}</strong
                    >
                </div>
            </div>
        </div>
    {/if}

    <!-- Sections -->
    <!-- Sections -->
    <section
        bind:this={scrollContainer}
        class="sidebar-scroll-area"
        style="flex: 1; overflow-y: auto; padding: 8px 0; outline: none;"
        aria-label="Conteúdo da Sidebar"
    >
        <!-- GERAL Section -->
        <div style="margin-bottom: 10px;">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                on:click={() => toggleSection("geral")}
                style="padding: 6px 16px; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.03em; cursor: pointer; user-select: none; transition: color 0.2s;"
            >
                {openSections.geral ? "▼" : "▶"} GERAL
            </div>
            {#if openSections.geral}
                <div style="padding-left: 10px;">
                    <!-- Todas -->
                    <CategoryDropdown
                        title="Todas"
                        icon="📚"
                        conversations={searchTerm || hasActiveAdvancedFilters
                            ? filtered
                            : conversations.filter(
                                  (c) => !metadata[getConvKey(c)]?.deleted,
                              )}
                        {metadata}
                        {activeId}
                        defaultOpen={true}
                        getSnippet={searchMode === "content"
                            ? getSnippetForConv
                            : null}
                        {searchTerm}
                        {folders}
                        on:select
                        on:action={handleContextAction}
                    />

                    <!-- Favoritos -->
                    <CategoryDropdown
                        title="Favoritos"
                        icon="⭐"
                        conversations={hasActiveAdvancedFilters
                            ? filtered.filter(
                                  (c) => metadata[getConvKey(c)]?.favorite,
                              )
                            : conversations.filter(
                                  (c) => metadata[getConvKey(c)]?.favorite,
                              )}
                        {metadata}
                        {activeId}
                        getSnippet={searchMode === "content"
                            ? getSnippetForConv
                            : null}
                        {searchTerm}
                        {folders}
                        on:select
                        on:action={handleContextAction}
                    />

                    <!-- PROJETOS (Folders) -->
                    <div style="margin: 4px 8px;">
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <BorderBeam duration={2.5} size={150}>
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div
                                on:click={() =>
                                    toggleCategory(
                                        "folders",
                                        "__PROJECTS_ROOT__",
                                    )}
                                class="category-header"
                                class:is-open={openCategories.folders[
                                    "__PROJECTS_ROOT__"
                                ]}
                            >
                                <span class="chevron"
                                    >{openCategories.folders[
                                        "__PROJECTS_ROOT__"
                                    ]
                                        ? "▼"
                                        : "▶"}</span
                                >
                                <span class="icon">🚀</span>
                                <span class="title">Projetos</span>
                                <span class="count">{folders.length}</span>

                                <!-- Add Button (Custom) -->
                                <button
                                    on:click|stopPropagation={createNewFolder}
                                    title="Novo Projeto"
                                    class="add-btn"
                                >
                                    +
                                </button>
                            </div>
                        </BorderBeam>

                        {#if openCategories.folders["__PROJECTS_ROOT__"]}
                            <div class="projects-list custom-scrollbar">
                                {#if folders.length === 0}
                                    <div
                                        style="padding: 8px; font-size: 11px; color: var(--color-text-tertiary); font-style: italic;"
                                    >
                                        Nenhum projeto criado
                                    </div>
                                {:else}
                                    {#each folders as folderName}
                                        {@const fm = getFolderMeta(folderName)}
                                        {@const baseConvs =
                                            hasActiveAdvancedFilters
                                                ? filtered
                                                : conversations}
                                        {@const folderConvs = baseConvs.filter(
                                            (c) =>
                                                metadata[getConvKey(c)]
                                                    ?.folder === folderName &&
                                                !metadata[getConvKey(c)]
                                                    ?.deleted,
                                        )}
                                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                                        <div
                                            class="folder-row"
                                            role="listitem"
                                            class:drag-over={dragOverFolder ===
                                                folderName}
                                            on:dragover={(e) =>
                                                handleDragOver(e, folderName)}
                                            on:dragleave={handleDragLeave}
                                            on:drop={(e) =>
                                                handleDrop(e, folderName)}
                                        >
                                            <div
                                                class="folder-dropdown-wrapper"
                                            >
                                                <CategoryDropdown
                                                    title={folderName}
                                                    icon={fm.icon}
                                                    conversations={folderConvs}
                                                    {metadata}
                                                    {activeId}
                                                    {folders}
                                                    on:select
                                                    on:action={handleContextAction}
                                                />
                                            </div>
                                            <button
                                                class="folder-trash-btn"
                                                on:click|stopPropagation={() =>
                                                    deleteFolder(folderName)}
                                                title="Excluir pasta (conversas serão movidas para 'Todos')"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    {/each}
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>

        <!-- Footer hotkeys hint -->
        <div
            style="padding: 8px 16px; border-top: 1px solid var(--border); font-size: 10px; color: var(--color-text-secondary); background: var(--bg-panel);"
        >
            <div>⌨️ Hotkeys disponíveis:</div>
            <div
                style="margin-top: 4px; display: flex; flex-direction: column; gap: 2px;"
            >
                <div>
                    <kbd
                        style="background: var(--layer-2); padding: 2px 4px; border-radius: 3px;"
                        >Ctrl+Shift+F</kbd
                    > → Favoritos
                </div>
                <div>
                    <kbd
                        style="background: var(--layer-2); padding: 2px 4px; border-radius: 3px;"
                        >Ctrl+Shift+S</kbd
                    > → Stats
                </div>
            </div>
        </div>
    </section>
</aside>

<!-- Folder Input Modal -->
<InputModal
    bind:isOpen={modalOpen}
    title={modalTitle}
    placeholder={modalPlaceholder}
    defaultValue={modalDefault}
    on:submit={handleModalSubmit}
/>

<!-- Visual Icon Picker -->
<IconPicker
    bind:isOpen={iconPickerOpen}
    selectedIcon={pendingIcon}
    on:select={handleIconSelect}
/>

<!-- Visual Color Picker -->
<ColorPicker
    bind:isOpen={colorPickerOpen}
    selectedColor={pendingColor}
    on:select={handleColorSelect}
/>

<style>
    /* Projects List */
    .projects-list {
        margin-top: 4px;
        margin-left: 4px; /* Align with others */
        padding-left: 10px;
        border-left: 1px solid var(--border-light);
    }

    /* Folder Row Container */
    .folder-row {
        display: flex;
        align-items: flex-start;
        gap: 4px;
        position: relative;
        border-radius: var(--radius-small);
        transition: background 0.2s;
    }

    .folder-row.drag-over {
        background: rgba(157, 78, 221, 0.2);
        box-shadow: 0 0 0 2px var(--highlight);
    }

    .folder-dropdown-wrapper {
        flex: 1;
        min-width: 0;
    }

    .folder-trash-btn {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        background: transparent;
        border: 1px solid transparent;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        opacity: 0;
        margin-top: 6px;
    }

    .folder-row:hover .folder-trash-btn {
        opacity: 0.5;
    }

    .folder-trash-btn:hover {
        opacity: 1 !important;
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.3);
    }

    /* COPIED STYLES FROM CategoryDropdown for consistency */
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

    .category-header .chevron {
        font-size: 10px;
        color: var(--color-text-secondary);
        width: 14px;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-block;
    }

    .category-header.is-open .chevron {
        transform: rotate(90deg);
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

    .add-btn {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        color: var(--color-text-secondary);
        transition: all 0.2s;
        margin-left: 4px;
    }
    .add-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }
    .sidebar-scroll-area:focus {
        outline: none;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            max-height: 0;
        }
        to {
            opacity: 1;
            max-height: 200px;
        }
    }

    button:hover {
        transform: scale(1.05);
        background: var(--accent-2) !important;
        color: #fff !important;
    }

    /* Premium Sidebar Search Input */
    .sidebar-search-input {
        width: 100%;
        padding: 10px 14px;
        font-size: 13px;
        border-radius: 8px;
        border: 1px solid var(--border-light);
        background: rgba(0, 0, 0, 0.2); /* Deep recessed look */
        color: var(--color-text-primary);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        outline: none;
    }

    .sidebar-search-input:focus {
        background: rgba(0, 0, 0, 0.3);
        border-color: rgba(157, 78, 221, 0.4);
        box-shadow:
            inset 0 2px 4px rgba(0, 0, 0, 0.1),
            0 0 0 3px rgba(157, 78, 221, 0.1);
    }

    .sidebar-search-input::placeholder {
        color: var(--color-text-tertiary);
        transition: color 0.2s;
    }

    .sidebar-search-input:hover::placeholder {
        color: var(--color-text-secondary);
    }

    kbd {
        font-family: monospace;
        font-size: 9px;
    }

    /* Search Row with Filter */
    .search-row {
        display: flex;
        gap: 6px;
        align-items: stretch;
    }

    .search-row .sidebar-search-input {
        flex: 1;
    }

    .filter-trigger {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid var(--border-light);
        background: rgba(0, 0, 0, 0.2);
        color: var(--color-text-tertiary);
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
    }

    .filter-trigger:hover {
        background: rgba(139, 92, 246, 0.1);
        border-color: rgba(139, 92, 246, 0.3);
        color: #c4b5fd;
    }

    .filter-trigger.active {
        background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.15),
            rgba(124, 58, 237, 0.1)
        );
        border-color: rgba(139, 92, 246, 0.4);
        color: #a78bfa;
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.15);
    }

    .filter-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: linear-gradient(135deg, #a78bfa, #7c3aed);
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        min-width: 16px;
        height: 16px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
    }
</style>
