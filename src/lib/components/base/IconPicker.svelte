<script>
    import { createEventDispatcher } from "svelte";

    export let isOpen = false;
    export let selectedIcon = "📁";

    const dispatch = createEventDispatcher();

    // Categorias de emojis para organização tipo Notion
    const categories = [
        {
            name: "Recentes",
            key: "recent",
            emojis: [], // Preenchido dinamicamente
        },
        {
            name: "Pastas & Arquivos",
            key: "folders",
            emojis: [
                "📁",
                "📂",
                "🗂️",
                "📋",
                "📄",
                "📝",
                "📑",
                "🗃️",
                "🗄️",
                "📦",
                "💼",
                "🎒",
            ],
        },
        {
            name: "Produtividade",
            key: "productivity",
            emojis: [
                "✅",
                "📌",
                "🎯",
                "⭐",
                "🔥",
                "💡",
                "⚡",
                "🚀",
                "💪",
                "🏆",
                "📊",
                "📈",
            ],
        },
        {
            name: "Tech & Code",
            key: "tech",
            emojis: [
                "💻",
                "🖥️",
                "⌨️",
                "🖱️",
                "💾",
                "📱",
                "🔧",
                "⚙️",
                "🛠️",
                "🤖",
                "🧠",
                "🔮",
            ],
        },
        {
            name: "Criativo",
            key: "creative",
            emojis: [
                "🎨",
                "✏️",
                "🖌️",
                "🎬",
                "📷",
                "🎵",
                "🎹",
                "🎸",
                "🎮",
                "🎲",
                "🎭",
                "🎪",
            ],
        },
        {
            name: "Comunicação",
            key: "communication",
            emojis: [
                "💬",
                "📧",
                "📩",
                "📨",
                "✉️",
                "💌",
                "📞",
                "📲",
                "🔔",
                "📢",
                "🗣️",
                "👥",
            ],
        },
        {
            name: "Natureza",
            key: "nature",
            emojis: [
                "🌟",
                "🌙",
                "☀️",
                "🌈",
                "🌸",
                "🌺",
                "🌻",
                "🌴",
                "🍀",
                "🌊",
                "🔥",
                "❄️",
            ],
        },
        {
            name: "Símbolos",
            key: "symbols",
            emojis: [
                "❤️",
                "💜",
                "💙",
                "💚",
                "💛",
                "🧡",
                "🖤",
                "💎",
                "🔷",
                "🔶",
                "⬛",
                "⬜",
            ],
        },
    ];

    let searchQuery = "";
    let activeCategory = "folders";
    let recentEmojis = [];

    // Carregar recentes do localStorage
    try {
        const saved = localStorage.getItem("pkm_recent_emojis");
        if (saved) recentEmojis = JSON.parse(saved);
    } catch (e) {}

    // Atualizar categoria de recentes
    $: categories[0].emojis = recentEmojis.slice(0, 12);

    // Filtrar emojis por busca
    $: filteredEmojis = searchQuery
        ? categories
              .flatMap((c) => c.emojis)
              .filter((e) => e.includes(searchQuery))
        : [];

    function selectEmoji(emoji) {
        // Adicionar aos recentes
        recentEmojis = [
            emoji,
            ...recentEmojis.filter((e) => e !== emoji),
        ].slice(0, 12);
        localStorage.setItem("pkm_recent_emojis", JSON.stringify(recentEmojis));

        selectedIcon = emoji;
        dispatch("select", { icon: emoji });
        isOpen = false;
    }

    function handleKeydown(e) {
        if (e.key === "Escape") {
            isOpen = false;
        }
    }
</script>

{#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="picker-overlay"
        on:click={() => (isOpen = false)}
        on:keydown={handleKeydown}
    >
        <div class="picker-container" on:click|stopPropagation>
            <!-- Header -->
            <div class="picker-header">
                <span class="picker-title">Escolher Ícone</span>
                <button class="close-btn" on:click={() => (isOpen = false)}
                    >×</button
                >
            </div>

            <!-- Search -->
            <div class="search-wrapper">
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Buscar emoji..."
                    class="search-input"
                />
            </div>

            <!-- Categories Tabs -->
            {#if !searchQuery}
                <div class="categories-tabs">
                    {#each categories as cat}
                        {#if cat.emojis.length > 0 || cat.key !== "recent"}
                            <button
                                class="cat-tab"
                                class:active={activeCategory === cat.key}
                                on:click={() => (activeCategory = cat.key)}
                                title={cat.name}
                            >
                                {cat.emojis[0] || "📁"}
                            </button>
                        {/if}
                    {/each}
                </div>
            {/if}

            <!-- Emoji Grid -->
            <div class="emoji-grid-wrapper">
                {#if searchQuery}
                    <div class="category-label">Resultados</div>
                    <div class="emoji-grid">
                        {#each filteredEmojis as emoji}
                            <button
                                class="emoji-btn"
                                class:selected={selectedIcon === emoji}
                                on:click={() => selectEmoji(emoji)}
                            >
                                {emoji}
                            </button>
                        {/each}
                        {#if filteredEmojis.length === 0}
                            <div class="no-results">
                                Nenhum emoji encontrado
                            </div>
                        {/if}
                    </div>
                {:else}
                    {#each categories as cat}
                        {#if cat.key === activeCategory && cat.emojis.length > 0}
                            <div class="category-label">{cat.name}</div>
                            <div class="emoji-grid">
                                {#each cat.emojis as emoji}
                                    <button
                                        class="emoji-btn"
                                        class:selected={selectedIcon === emoji}
                                        on:click={() => selectEmoji(emoji)}
                                    >
                                        {emoji}
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    {/each}
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .picker-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .picker-container {
        background: linear-gradient(
            135deg,
            rgba(26, 26, 36, 0.95),
            rgba(18, 18, 28, 0.98)
        );
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        width: 320px;
        max-height: 420px;
        overflow: hidden;
        box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(139, 92, 246, 0.1);
        animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .picker-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .picker-title {
        font-size: 14px;
        font-weight: 600;
        color: #fff;
    }

    .close-btn {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        background: transparent;
        color: rgba(255, 255, 255, 0.5);
        font-size: 18px;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
    }

    .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }

    .search-wrapper {
        padding: 8px 12px;
    }

    .search-input {
        width: 100%;
        padding: 10px 14px;
        font-size: 13px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0, 0, 0, 0.3);
        color: #fff;
        outline: none;
        transition: all 0.2s;
    }

    .search-input:focus {
        border-color: rgba(139, 92, 246, 0.5);
        box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    .search-input::placeholder {
        color: rgba(255, 255, 255, 0.3);
    }

    .categories-tabs {
        display: flex;
        gap: 4px;
        padding: 4px 12px 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        overflow-x: auto;
    }

    .cat-tab {
        padding: 6px 10px;
        border-radius: 8px;
        background: transparent;
        border: none;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
        opacity: 0.6;
    }

    .cat-tab:hover {
        background: rgba(255, 255, 255, 0.05);
        opacity: 1;
    }

    .cat-tab.active {
        background: rgba(139, 92, 246, 0.2);
        opacity: 1;
    }

    .emoji-grid-wrapper {
        padding: 12px;
        max-height: 240px;
        overflow-y: auto;
    }

    .category-label {
        font-size: 10px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 8px;
    }

    .emoji-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 6px;
    }

    .emoji-btn {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background: transparent;
        border: 1px solid transparent;
        font-size: 22px;
        cursor: pointer;
        transition: all 0.15s;
    }

    .emoji-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: scale(1.1);
    }

    .emoji-btn.selected {
        background: rgba(139, 92, 246, 0.3);
        border-color: rgba(139, 92, 246, 0.5);
    }

    .no-results {
        grid-column: 1 / -1;
        text-align: center;
        color: rgba(255, 255, 255, 0.4);
        font-size: 12px;
        padding: 20px;
    }

    /* Custom Scrollbar */
    .emoji-grid-wrapper::-webkit-scrollbar {
        width: 6px;
    }

    .emoji-grid-wrapper::-webkit-scrollbar-track {
        background: transparent;
    }

    .emoji-grid-wrapper::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
    }

    .emoji-grid-wrapper::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
    }
</style>
