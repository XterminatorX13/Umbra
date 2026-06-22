<script>
    import { createEventDispatcher, onMount, onDestroy } from "svelte";
    import { getConvKey } from "$lib/utils";
    import CategoryDropdown from "./components/CategoryDropdown.svelte";

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

    // Get all unique folders
    $: foldersSet = new Set(
        conversations
            .map((c) => metadata[getConvKey(c)]?.folder)
            .filter(Boolean),
    );
    $: folders = Array.from(foldersSet).sort();

    // Filtered conversations with search
    $: filtered = conversations.filter((c) => {
        const key = getConvKey(c);
        const meta = metadata[key] ?? {};
        if (meta.deleted) return false;

        if (activeFolder === "__ALL__") {
            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                return (c.title || "").toLowerCase().includes(q);
            }
            return true;
        }
        if (activeFolder === "__FAV__") return !!meta.favorite;
        return meta.folder === activeFolder;
    });

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
        const name = prompt("Nome da nova pasta:", "");
        if (!name?.trim()) return;
        const trimmed = name.trim();

        const icon = prompt(`Ícone para "${trimmed}" (emoji):`, "📁") || "📁";
        const color =
            prompt(`Cor em hex para "${trimmed}":`, randomFolderColor()) ||
            randomFolderColor();

        folderMeta[trimmed] = { icon, color };
        folderMeta = { ...folderMeta };
        saveFolderMeta();
    }

    function editFolderSettings(name) {
        const current = getFolderMeta(name);
        const icon = prompt(
            `Ícone para a pasta "${name}":`,
            current.icon || "📁",
        );
        if (icon === null) return;
        const color = prompt(
            `Cor em hex para a pasta "${name}":`,
            current.color || "#4F1366",
        );
        if (color === null) return;

        folderMeta[name] = { icon, color };
        folderMeta = { ...folderMeta };
        saveFolderMeta();
    }

    function deleteFolder(name) {
        if (
            !confirm(
                `Deletar pasta "${name}"? As conversas não serão deletadas.`,
            )
        )
            return;

        // Remove folder from all conversations
        conversations.forEach((c) => {
            const key = getConvKey(c);
            if (metadata[key]?.folder === name) {
                delete metadata[key].folder;
            }
        });

        delete folderMeta[name];
        folderMeta = { ...folderMeta };
        saveFolderMeta();
        dispatch("metadataChanged");
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
    style="background: var(--bg-deep); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden;"
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
                    style="background: var(--layer-2); border: 1px solid var(--border-light); border-radius: 999px; font-size: 11px; padding: 4px 10px; color: var(--color-text-secondary); cursor: pointer; transition: all 0.2s;"
                >
                    + Pasta
                </button>
                <button
                    on:click={() => (showingStats = !showingStats)}
                    title="Estatísticas (Ctrl+Shift+S)"
                    style="background: var(--layer-2); border: 1px solid var(--border-light); border-radius: 999px; font-size: 11px; padding: 4px 8px; color: var(--color-text-secondary); cursor: pointer; transition: all 0.2s;"
                >
                    📊
                </button>
            </div>
        </div>

        <!-- Quick search -->
        <input
            type="text"
            bind:value={searchTerm}
            placeholder="Busca rápida..."
            style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-1); color: var(--color-text-primary);"
        />
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
    <div
        bind:this={scrollContainer}
        style="flex: 1; overflow-y: auto; padding: 8px 0;"
        tabindex="0"
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
                        conversations={conversations.filter(
                            (c) => !metadata[getConvKey(c)]?.deleted,
                        )}
                        {metadata}
                        {activeId}
                        defaultOpen={true}
                        on:select
                    />

                    <!-- Favoritos -->
                    <CategoryDropdown
                        title="Favoritos"
                        icon="⭐"
                        conversations={conversations.filter(
                            (c) => metadata[getConvKey(c)]?.favorite,
                        )}
                        {metadata}
                        {activeId}
                        on:select
                    />
                </div>
            {/if}
        </div>

        <!-- PASTAS Section -->
        {#if folders.length > 0}
            <div style="margin-bottom: 10px;">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                    on:click={() => toggleSection("pastas")}
                    style="padding: 6px 16px; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.03em; cursor: pointer; user-select: none; transition: color 0.2s;"
                >
                    {openSections.pastas ? "▼" : "▶"} PASTAS ({folders.length})
                </div>
                {#if openSections.pastas}
                    <div style="padding-left: 10px;">
                        {#each folders as folderName}
                            {@const fm = getFolderMeta(folderName)}
                            {@const folderConvs = conversations.filter(
                                (c) =>
                                    metadata[getConvKey(c)]?.folder ===
                                        folderName &&
                                    !metadata[getConvKey(c)]?.deleted,
                            )}
                            <CategoryDropdown
                                title={folderName}
                                icon={fm.icon}
                                conversations={folderConvs}
                                {metadata}
                                {activeId}
                                on:select
                            />
                        {/each}
                    </div>
                {/if}
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
</aside>

<style>
    /* Remove focus outline from scroll container (keyboard nav is handled) */
    div[tabindex="0"]:focus {
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

    .conv-row:hover {
        transform: translateX(4px);
        border-color: var(--highlight) !important;
        box-shadow: 0 2px 10px rgba(217, 111, 255, 0.2) !important;
    }

    kbd {
        font-family: monospace;
        font-size: 9px;
    }
</style>
