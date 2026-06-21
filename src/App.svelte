<script>
    import { onMount, onDestroy } from "svelte";
    import Sidebar from "./lib/Sidebar.svelte";
    import ChatView from "./lib/ChatView.svelte";
    import DebugPanel from "./lib/components/DebugPanel.svelte";
    import ImportDialog from "./lib/components/ImportDialog.svelte";
    import ExportGuide from "./lib/components/ExportGuide.svelte";
    import { normalizeConversation, getConvKey } from "./lib/utils.js";
    import { parseFile } from "./lib/parsers/index.js";
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
    let showImportDialog = false;
    let showExportGuide = false;

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
                allConversations = convs.map(normalizeConversation);
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

    async function handleFileInput(e) {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        for (const file of files) {
            try {
                const result = await parseFile(file);
                const normalized = result.conversations.map(normalizeConversation);
                allConversations = [...allConversations, ...normalized];
            } catch (err) {
                console.error(`Erro ao importar ${file.name}:`, err);
                alert(`Erro ao importar ${file.name}: ${err.message}`);
            }
        }

        if (allConversations.length > 0) {
            showWelcome = false;
            saveConversations(allConversations).catch((e) =>
                console.warn("Could not save conversations:", e),
            );
        }
    }

    function handleImportFromDialog(event) {
        const { conversations } = event.detail;
        const normalized = conversations.map(normalizeConversation);
        allConversations = [...allConversations, ...normalized];
        showWelcome = false;
        showImportDialog = false;

        saveConversations(allConversations).catch((e) =>
            console.warn("Could not save conversations:", e),
        );
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
                    style="font-size: 32px; font-weight: 700; color: var(--highlight); margin-bottom: 8px; text-shadow: 0 0 30px rgba(217, 111, 255, 0.5);"
                >
                    Umbra
                </h1>
                <p
                    style="font-size: 14px; color: var(--color-text-secondary); margin-bottom: 24px; letter-spacing: 0.1em; text-transform: uppercase;"
                >
                    Personal Knowledge Manager
                </p>
                <p
                    style="font-size: 16px; color: var(--color-text-primary); margin-bottom: 32px; line-height: 1.6;"
                >
                    Importe e organize suas conversas de
                    <strong style="color: #10A37F;">ChatGPT</strong>,
                    <strong style="color: #4285F4;">Gemini</strong>,
                    <strong style="color: #D97757;">Claude</strong> e
                    <strong style="color: #E8E8E8;">Grok</strong>
                </p>
                <div
                    style="display: flex; flex-direction: column; gap: 12px; align-items: center;"
                >
                    <button
                        on:click={() => (showImportDialog = true)}
                        style="padding: 16px 32px; background: linear-gradient(135deg, var(--accent-1), var(--accent-2)); color: #fff; font-size: 16px; font-weight: 600; border-radius: var(--radius); cursor: pointer; transition: all 0.3s; box-shadow: 0 8px 30px rgba(217, 111, 255, 0.4); border: none;"
                    >
                        📥 Importar Conversas
                    </button>
                    <button
                        on:click={() => (showExportGuide = true)}
                        style="padding: 10px 24px; background: transparent; border: 1px solid var(--border-light); color: var(--color-text-secondary); font-size: 13px; border-radius: var(--radius); cursor: pointer; transition: all 0.2s;"
                    >
                        📖 Como exportar minhas conversas?
                    </button>

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
            <button
                on:click={() => (showImportDialog = true)}
                style="padding: 6px 12px; font-size: 12px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: var(--color-text-primary); cursor: pointer; transition: all 0.2s;"
            >
                📥 Importar Conversas
            </button>
            <button
                on:click={() => (showExportGuide = true)}
                title="Como exportar conversas"
                style="padding: 6px 12px; font-size: 12px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: var(--color-text-secondary); cursor: pointer; transition: all 0.2s;"
            >
                📖 Guia
            </button>

            <div style="flex: 1;"></div>

            <button
                on:click={exportAllMetadata}
                title="Exportar metadata (Ctrl+E)"
                style="padding: 6px 10px; font-size: 11px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: var(--color-text-secondary); cursor: pointer;"
            >
                💾 Exportar Meta
            </button>
            <button
                on:click={importMetadata}
                title="Importar metadata (Ctrl+I)"
                style="padding: 6px 10px; font-size: 11px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: var(--color-text-secondary); cursor: pointer;"
            >
                📥 Importar Meta
            </button>
            <button
                on:click={clearAllData}
                style="padding: 6px 10px; font-size: 11px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: #ff6b6b; cursor: pointer;"
            >
                🗑️ Limpar Tudo
            </button>
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

<!-- Dialogs -->
<ImportDialog bind:show={showImportDialog} on:import={handleImportFromDialog} />
<ExportGuide bind:show={showExportGuide} />

<!-- Debug Panel (Ctrl+Shift+D to toggle) -->
<DebugPanel />

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

    button:hover {
        transform: scale(1.05);
        background: var(--accent-2) !important;
        color: #fff !important;
    }
</style>
