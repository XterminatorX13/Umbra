<script>
    import { onMount, onDestroy } from "svelte";
    import Sidebar from "./lib/Sidebar.svelte";
    import ChatView from "./lib/ChatView.svelte";
    import DebugPanel from "./lib/components/DebugPanel.svelte";
    import CommandPalette from "./lib/components/CommandPalette.svelte";
    import GlitchButton from "./lib/components/GlitchButton.svelte";
    import { normalizeConversation, getConvKey } from "./lib/utils.js";
    import {
        loadConversations,
        saveConversations,
        loadAllMetadata,
        saveAllMetadata,
        migrateFromLocalStorage,
        getDbStats,
    } from "./lib/db.js";

    let allConversations = [];
    let metadata = {};
    let activeId = null;
    let activeFolder = "__ALL__";
    let folderMeta = {};
    let showWelcome = true;

    const FOLDER_META_KEY = "pkm_folder_meta_v1";

    $: activeConversation = activeId
        ? allConversations.find((c) => getConvKey(c) === activeId)
        : null;
    $: activeMeta = activeId ? metadata[activeId] || {} : {};

    onMount(async () => {
        // First, try to migrate from localStorage to IndexedDB
        await migrateFromLocalStorage();

        // Load conversations from IndexedDB
        try {
            const convs = await loadConversations();
            if (convs.length > 0) {
                // Normalize AND sort by updateTime desc
                allConversations = convs
                    .map(normalizeConversation)
                    .sort((a, b) => (b.updateTime || 0) - (a.updateTime || 0));

                showWelcome = false;
                console.log(
                    `📂 Loaded ${allConversations.length} conversations`,
                );
            }
        } catch (e) {
            console.error("Error loading conversations:", e);
        }

        // Load metadata from IndexedDB
        try {
            metadata = await loadAllMetadata();
        } catch (e) {
            console.error("Error loading metadata:", e);
        }

        // Load folder metadata (keep in localStorage - small data)
        try {
            const saved = localStorage.getItem(FOLDER_META_KEY);
            if (saved) folderMeta = JSON.parse(saved);
        } catch (e) {
            console.error("Error loading folder meta:", e);
        }

        // Log DB stats
        const stats = await getDbStats();
        console.log(
            `📊 DB Stats: ${stats.conversations} conversations, ${stats.metadata} metadata`,
        );
    });

    function handleFileInput(e) {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        let remaining = files.length;
        const newConversations = [];

        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const text = ev.target.result;
                    const data = JSON.parse(text);
                    const arr = Array.isArray(data)
                        ? data
                        : data.conversations || [];

                    arr.forEach((raw) => {
                        const norm = normalizeConversation(raw);
                        newConversations.push(norm);
                    });
                } catch (err) {
                    console.error("Erro ao ler JSON:", err);
                    alert("Erro ao ler JSON: " + err.message);
                } finally {
                    remaining--;
                    if (remaining === 0) {
                        allConversations = [
                            ...allConversations,
                            ...newConversations,
                        ];
                        showWelcome = false;

                        // Auto-save to IndexedDB
                        saveConversations(
                            allConversations.map((c) => c.raw || c),
                        ).catch((e) =>
                            console.warn("Could not save conversations:", e),
                        );
                    }
                }
            };
            reader.readAsText(file, "utf-8");
        });
    }

    function handleSelect(event) {
        activeId = event.detail.id;
    }

    function handleUpdateMeta(event) {
        const { id, ...rest } = event.detail;
        if (!metadata[id]) metadata[id] = {};

        metadata[id] = {
            ...metadata[id],
            ...rest,
        };

        metadata = { ...metadata };
        saveMetadata();
    }

    function handleToggleFav(event) {
        const { id } = event.detail;
        if (!metadata[id]) metadata[id] = {};
        metadata[id].favorite = !metadata[id].favorite;
        metadata = { ...metadata };
        saveMetadata();
    }

    function handleBulkFavorite(event) {
        const { id } = event.detail;
        if (!metadata[id]) metadata[id] = {};
        metadata[id].favorite = true;
        metadata = { ...metadata };
        saveMetadata();
    }

    function handleBulkMove(event) {
        const { id, folder } = event.detail;
        if (!metadata[id]) metadata[id] = {};
        metadata[id].folder = folder;
        metadata = { ...metadata };
        saveMetadata();
    }

    function handleBulkDelete(event) {
        const { id } = event.detail;
        if (!metadata[id]) metadata[id] = {};
        metadata[id].deleted = true;
        metadata = { ...metadata };
        saveMetadata();
    }

    function handleMetadataChanged() {
        metadata = { ...metadata };
        saveMetadata();
    }

    async function saveMetadata() {
        // Save to IndexedDB instead of localStorage
        await saveAllMetadata(metadata);
    }

    function exportAllMetadata() {
        const blob = new Blob([JSON.stringify(metadata, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `metadata-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function importMetadata() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    metadata = { ...metadata, ...data };
                    saveMetadata();
                    alert("Metadata importada com sucesso!");
                } catch (err) {
                    alert("Erro ao importar metadata: " + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function clearAllData() {
        if (
            !confirm(
                "ATENÇÃO: Isso vai deletar TODAS as conversas e metadados. Tem certeza?",
            )
        )
            return;
        allConversations = [];
        metadata = {};
        activeId = null;
        showWelcome = true;
        localStorage.removeItem("auto-saved-conversations");
        localStorage.setItem(METADATA_FILENAME, "{}");
    }

    // Global hotkeys
    function handleKeydown(e) {
        // Ctrl/Cmd + E = Export metadata
        if ((e.ctrlKey || e.metaKey) && e.key === "e") {
            e.preventDefault();
            exportAllMetadata();
        }
        // Ctrl/Cmd + I = Import metadata
        if ((e.ctrlKey || e.metaKey) && e.key === "i") {
            e.preventDefault();
            importMetadata();
        }
        // Arrow keys for navigation
        if (allConversations.length > 0 && activeId) {
            const currentIndex = allConversations.findIndex(
                (c) => getConvKey(c) === activeId,
            );
            if (e.key === "ArrowUp" && currentIndex > 0) {
                e.preventDefault();
                activeId = getConvKey(allConversations[currentIndex - 1]);
            }
            if (
                e.key === "ArrowDown" &&
                currentIndex < allConversations.length - 1
            ) {
                e.preventDefault();
                activeId = getConvKey(allConversations[currentIndex + 1]);
            }
        }
    }

    onMount(() => {
        window.addEventListener("keydown", handleKeydown);
    });

    onDestroy(() => {
        window.removeEventListener("keydown", handleKeydown);
    });
</script>

<!-- 2-column layout: Sidebar + ChatView -->
<div
    style="display: grid; grid-template-columns: 320px 1fr; height: 100vh; width: 100vw; background: var(--bg-main); position: relative;"
>
    <!-- Welcome overlay -->
    {#if showWelcome && allConversations.length === 0}
        <div
            style="position: absolute; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.5s;"
        >
            <div style="text-align: center; max-width: 600px; padding: 40px;">
                <div
                    style="font-size: 72px; margin-bottom: 20px; animation: float 3s ease-in-out infinite;"
                >
                    ✨
                </div>
                <h1
                    style="font-size: 32px; font-weight: 700; color: var(--highlight); margin-bottom: 16px; text-shadow: 0 0 30px rgba(217, 111, 255, 0.5);"
                >
                    PKM ChatGPT 2.0
                </h1>
                <p
                    style="font-size: 18px; color: var(--color-text-primary); margin-bottom: 32px; line-height: 1.6;"
                >
                    Sistema de gerenciamento pessoal de conhecimento para suas
                    conversas do ChatGPT
                </p>
                <div
                    style="display: flex; flex-direction: column; gap: 16px; align-items: center;"
                >
                    <label
                        for="welcome-file-input"
                        style="padding: 16px 32px; background: linear-gradient(135deg, var(--accent-1), var(--accent-2)); color: #fff; font-size: 16px; font-weight: 600; border-radius: var(--radius); cursor: pointer; transition: all 0.3s; box-shadow: 0 8px 30px rgba(217, 111, 255, 0.4);"
                    >
                        📁 Carregar Conversas
                    </label>
                    <input
                        id="welcome-file-input"
                        type="file"
                        on:change={handleFileInput}
                        multiple
                        accept=".json"
                        style="display: none;"
                    />

                    <div
                        style="font-size: 12px; color: var(--color-text-secondary); margin-top: 16px;"
                    >
                        <div style="margin-bottom: 8px;">
                            ⌨️ Atalhos disponíveis:
                        </div>
                        <div
                            style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; text-align: left;"
                        >
                            <div>
                                <kbd
                                    style="background: var(--layer-2); padding: 2px 6px; border-radius: 3px;"
                                    >Ctrl+K</kbd
                                > Busca
                            </div>
                            <div>
                                <kbd
                                    style="background: var(--layer-2); padding: 2px 6px; border-radius: 3px;"
                                    >↑↓</kbd
                                > Navegar
                            </div>
                            <div>
                                <kbd
                                    style="background: var(--layer-2); padding: 2px 6px; border-radius: 3px;"
                                    >Ctrl+E</kbd
                                > Exportar
                            </div>
                            <div>
                                <kbd
                                    style="background: var(--layer-2); padding: 2px 6px; border-radius: 3px;"
                                    >Ctrl+I</kbd
                                > Importar
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Left: Sidebar with folders and conversation list -->
    <Sidebar
        conversations={allConversations}
        {metadata}
        {activeId}
        on:select={handleSelect}
        on:updateMeta={handleUpdateMeta}
        on:metadataChanged={handleMetadataChanged}
    />

    <!-- Right: Chat viewer with file input bar -->
    <div style="display: flex; flex-direction: column; overflow: hidden;">
        <!-- File input bar at top -->
        <div
            style="background: var(--bg-panel); border-bottom: 1px solid var(--border); padding: 10px 16px; display: flex; align-items: center; gap: 12px; flex-shrink: 0;"
        >
            <label
                for="main-file-input"
                style="padding: 6px 12px; font-size: 12px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: var(--color-text-primary); cursor: pointer; transition: all 0.2s;"
            >
                📁 Adicionar Arquivos
            </label>
            <input
                id="main-file-input"
                type="file"
                on:change={handleFileInput}
                multiple
                accept=".json"
                style="display: none;"
            />

            <div style="flex: 1;"></div>

            <GlitchButton on:click={exportAllMetadata}>
                💾 Exportar Meta
            </GlitchButton>
            <GlitchButton on:click={importMetadata}>
                📥 Importar Meta
            </GlitchButton>
            <GlitchButton on:click={clearAllData} className="danger">
                🗑️ Limpar Tudo
            </GlitchButton>
        </div>

        <!-- ChatView takes remaining space -->
        <ChatView
            conversation={activeConversation}
            meta={activeMeta}
            on:updateMeta={handleUpdateMeta}
            on:toggleFav={handleToggleFav}
            on:deselect={() => (activeId = null)}
        />
    </div>
</div>

<!-- Debug Panel (Ctrl+Shift+D to toggle) -->
<DebugPanel />

<!-- Command Palette (Ctrl+K) -->
<CommandPalette
    conversations={allConversations}
    {metadata}
    on:select={handleSelect}
    on:action={(e) => {
        const action = e.detail.action;
        if (action === "favorites") activeFolder = "__FAV__";
        else if (action === "all") activeFolder = "__ALL__";
        else if (action === "stats") console.log("Open stats");
    }}
/>

<style>
    /* ===== PERFORMANCE OPTIMIZATIONS ===== */
    /* Baseado no ARQUIVO.HTML mobile-first */

    /* Optimizações removidas temporariamente - causaram bug no scroll */

    /* ===== ANIMATIONS ===== */
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes float {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-20px);
        }
    }

    label:hover {
        transform: scale(1.05);
        box-shadow: 0 12px 40px rgba(217, 111, 255, 0.6) !important;
    }
</style>
