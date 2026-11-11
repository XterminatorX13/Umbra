<script>
    import { onMount, onDestroy } from "svelte";
    import { ChevronDown, Search, Sparkles, HardDrive, Zap } from "lucide-svelte";
    import { catalog, currentModel, setModel } from "$lib/ai/chatStore.js";

    const PROVIDER_LABELS = {
        openrouter: "OpenRouter",
        openai: "OpenAI",
        anthropic: "Anthropic",
        google: "Google",
        ollama: "Ollama",
        omniroute: "OmniRoute",
    };

    const MAX_ROWS = 60;

    let open = false;
    let search = "";
    let filter = "all"; // 'all' | 'free' | providerId
    let searchInputEl;
    let rootEl;

    // Catálogo "achatado": [{...model, providerId}]
    $: flat = Object.entries($catalog.providers || {}).flatMap(([providerId, models]) =>
        (models || []).map((m) => ({ ...m, providerId })),
    );

    $: providerCounts = Object.entries($catalog.providers || {})
        .map(([id, models]) => ({ id, count: (models || []).length }))
        .filter((p) => p.count > 0);

    $: freeCount = flat.filter((m) => m.free === true).length;

    $: filtered = flat.filter((m) => {
        if (filter === "free" && m.free !== true) return false;
        if (filter !== "all" && filter !== "free" && m.providerId !== filter) return false;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            return (
                (m.name || "").toLowerCase().includes(q) ||
                (m.id || "").toLowerCase().includes(q)
            );
        }
        return true;
    });

    $: visible = filtered.slice(0, MAX_ROWS);

    // Modelo atual + lookup no catálogo pra exibir nome
    $: currentSpec = $currentModel;
    $: currentMeta = currentSpec
        ? flat.find((m) => m.providerId === currentSpec.providerId && m.id === currentSpec.modelId)
        : null;
    $: currentLabel = currentSpec
        ? currentMeta?.name || currentSpec.modelId
        : "Selecionar modelo";

    function toggle() {
        open = !open;
        if (open) {
            search = "";
            setTimeout(() => searchInputEl?.focus(), 30);
        }
    }

    function select(model) {
        setModel({ providerId: model.providerId, modelId: model.id });
        open = false;
    }

    function handleKeydown(e) {
        if (e.key === "Escape" && open) {
            e.stopPropagation();
            open = false;
        }
    }

    function handleOutsideClick(e) {
        if (open && rootEl && !rootEl.contains(e.target)) {
            open = false;
        }
    }

    onMount(() => window.addEventListener("mousedown", handleOutsideClick));
    onDestroy(() => window.removeEventListener("mousedown", handleOutsideClick));

    function formatContext(tokens) {
        if (!tokens) return null;
        if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(tokens % 1000000 === 0 ? 0 : 1)}M ctx`;
        if (tokens >= 1000) return `${Math.round(tokens / 1000)}K ctx`;
        return `${tokens} ctx`;
    }

    function formatCost(cost) {
        if (!cost) return null;
        const { input, output } = cost;
        if (input == null && output == null) return null;
        return `$${input ?? "?"}/$${output ?? "?"} /Mtok`;
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="model-picker" bind:this={rootEl}>
    <button
        class="picker-trigger"
        on:click={toggle}
        aria-expanded={open}
        title={currentSpec ? `${currentSpec.modelId} (${PROVIDER_LABELS[currentSpec.providerId] || currentSpec.providerId})` : "Escolher modelo"}
    >
        {#if currentMeta?.free}
            <Zap size={13} class="trigger-icon free" />
        {:else}
            <Sparkles size={13} class="trigger-icon" />
        {/if}
        <span class="trigger-label">{currentLabel}</span>
        <ChevronDown size={13} class="chevron" class:rotated={open} />
    </button>

    {#if open}
        <div class="picker-panel" role="listbox" aria-label="Modelos">
            <div class="picker-search">
                <Search size={13} />
                <input
                    bind:this={searchInputEl}
                    bind:value={search}
                    placeholder="Buscar modelo..."
                    spellcheck="false"
                />
            </div>

            <div class="picker-filters">
                <button class="chip" class:active={filter === "all"} on:click={() => (filter = "all")}>
                    Todos ({flat.length})
                </button>
                {#if freeCount > 0}
                    <button class="chip free" class:active={filter === "free"} on:click={() => (filter = "free")}>
                        Grátis ({freeCount})
                    </button>
                {/if}
                {#each providerCounts as p (p.id)}
                    <button
                        class="chip"
                        class:active={filter === p.id}
                        on:click={() => (filter = p.id)}
                    >
                        {PROVIDER_LABELS[p.id] || p.id} ({p.count})
                    </button>
                {/each}
            </div>

            <div class="picker-list">
                {#each visible as model (model.providerId + ":" + model.id)}
                    <button
                        class="model-row"
                        class:active={currentSpec?.providerId === model.providerId && currentSpec?.modelId === model.id}
                        on:click={() => select(model)}
                        role="option"
                        aria-selected={currentSpec?.providerId === model.providerId && currentSpec?.modelId === model.id}
                    >
                        <div class="model-main">
                            <span class="model-name">{model.name || model.id}</span>
                            <span class="model-id">{model.id}</span>
                        </div>
                        <div class="model-meta">
                            {#if model.local}
                                <span class="tag tag-local"><HardDrive size={10} /> local</span>
                            {:else if model.gateway}
                                <span class="tag tag-gateway">{PROVIDER_LABELS[model.gateway] || model.gateway}</span>
                            {:else}
                                <span class="tag">{PROVIDER_LABELS[model.providerId] || model.providerId}</span>
                            {/if}
                            {#if model.free === true}
                                <span class="tag tag-free">grátis</span>
                            {/if}
                            {#if model.contextWindow}
                                <span class="tag tag-ctx">{formatContext(model.contextWindow)}</span>
                            {/if}
                            {#if model.cost}
                                <span class="tag tag-cost">{formatCost(model.cost)}</span>
                            {/if}
                        </div>
                    </button>
                {/each}

                {#if visible.length === 0}
                    <div class="picker-empty">
                        {#if flat.length === 0}
                            Nenhum modelo no catálogo. Verifique a conexão ou configure providers em Configurações.
                        {:else}
                            Nenhum modelo encontrado para "{search}".
                        {/if}
                    </div>
                {/if}
            </div>

            {#if filtered.length > visible.length}
                <div class="picker-more">
                    Mostrando {visible.length} de {filtered.length} — refine a busca
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .model-picker {
        position: relative;
    }

    .picker-trigger {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        max-width: 260px;
        padding: 5px 10px;
        border-radius: var(--radius-small);
        border: 1px solid var(--border-light);
        background: var(--layer-2);
        color: var(--color-text-secondary, #b8b8c8);
        font-size: 0.78rem;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
    }

    .picker-trigger:hover {
        background: var(--layer-3);
        border-color: var(--border-focus);
    }

    .trigger-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--color-text-primary, #f0f0f5);
    }

    .trigger-icon :global(svg),
    .trigger-icon {
        color: var(--highlight);
        flex-shrink: 0;
    }

    .trigger-icon.free {
        color: #4ade80;
    }

    .chevron {
        flex-shrink: 0;
        transition: transform 0.15s;
    }

    .chevron.rotated {
        transform: rotate(180deg);
    }

    .picker-panel {
        position: absolute;
        bottom: calc(100% + 8px);
        left: 0;
        z-index: 40;
        width: min(430px, calc(100vw - 32px));
        max-height: 420px;
        display: flex;
        flex-direction: column;
        background: var(--bg-panel);
        border: 1px solid var(--border-light);
        border-radius: var(--radius);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(199, 125, 255, 0.08);
        overflow: hidden;
    }

    .picker-search {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid var(--border);
        color: var(--color-text-secondary, #b8b8c8);
    }

    .picker-search input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--color-text-primary, #f0f0f5);
        font-size: 0.85rem;
        font-family: inherit;
    }

    .picker-search input::placeholder {
        color: var(--color-text-secondary, #b8b8c8);
        opacity: 0.6;
    }

    .picker-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding: 8px 12px;
        border-bottom: 1px solid var(--border);
    }

    .chip {
        padding: 3px 9px;
        font-size: 0.72rem;
        border-radius: 999px;
        border: 1px solid var(--border-light);
        background: transparent;
        color: var(--color-text-secondary, #b8b8c8);
        cursor: pointer;
        transition: all 0.15s;
    }

    .chip:hover {
        background: var(--layer-2);
    }

    .chip.active {
        background: var(--accent-1);
        border-color: var(--accent-2);
        color: var(--color-text-primary, #f0f0f5);
    }

    .chip.free.active {
        border-color: #4ade80;
    }

    .picker-list {
        overflow-y: auto;
        padding: 4px;
    }

    .model-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
        text-align: left;
        padding: 8px 10px;
        border-radius: var(--radius-small);
        border: none;
        background: transparent;
        cursor: pointer;
        transition: background 0.1s;
    }

    .model-row:hover {
        background: var(--layer-2);
    }

    .model-row.active {
        background: var(--accent-1);
    }

    .model-name {
        font-size: 0.82rem;
        font-weight: 500;
        color: var(--color-text-primary, #f0f0f5);
    }

    .model-id {
        font-family: var(--font-mono);
        font-size: 0.68rem;
        color: var(--color-text-secondary, #b8b8c8);
        opacity: 0.75;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .model-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 2px;
    }

    .tag {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 0.64rem;
        padding: 1px 7px;
        border-radius: 999px;
        background: var(--layer-2);
        border: 1px solid var(--border-light);
        color: var(--color-text-secondary, #b8b8c8);
    }

    .tag-free {
        color: #4ade80;
        border-color: rgba(74, 222, 128, 0.4);
        background: rgba(74, 222, 128, 0.08);
        font-weight: 600;
    }

    .tag-local {
        color: var(--highlight);
    }

    .tag-gateway {
        color: var(--accent-2);
    }

    .tag-ctx {
        color: var(--color-text-secondary, #b8b8c8);
    }

    .tag-cost {
        color: #fbbf24;
        border-color: rgba(251, 191, 36, 0.25);
    }

    .picker-empty {
        padding: 24px 16px;
        text-align: center;
        font-size: 0.8rem;
        color: var(--color-text-secondary, #b8b8c8);
    }

    .picker-more {
        padding: 8px 12px;
        border-top: 1px solid var(--border);
        font-size: 0.7rem;
        text-align: center;
        color: var(--color-text-secondary, #b8b8c8);
        opacity: 0.7;
    }
</style>
