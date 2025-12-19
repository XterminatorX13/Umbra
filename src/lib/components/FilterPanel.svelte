<script>
    import { createEventDispatcher, onMount } from "svelte";
    import {
        Filter,
        X,
        Image,
        Globe,
        Sparkles,
        Calendar,
        ChevronDown,
    } from "lucide-svelte";
    import { fly, fade } from "svelte/transition";

    export let conversations = [];
    export let filters = {
        models: [],
        hasImageGen: null,
        hasWebSearch: null,
        isDeepResearch: null,
        dateFrom: null,
        dateTo: null,
    };
    export let isOpen = false;

    const dispatch = createEventDispatcher();

    // Extract unique models from conversations
    $: availableModels = [
        ...new Set(
            conversations
                .map((c) => c.filterMeta?.modelSlug)
                .filter(Boolean)
                .filter((m) => m !== "unknown"),
        ),
    ].sort();

    const modelNames = {
        "gpt-5": "GPT-5",
        "gpt-4o": "GPT-4o",
        "gpt-4o-mini": "GPT-4o Mini",
        o1: "o1",
        "o1-mini": "o1-mini",
        o3: "o3",
        "o4-mini": "o4-mini",
        research: "Deep Research",
        "gpt-4": "GPT-4",
        "gpt-4-turbo": "GPT-4 Turbo",
    };

    function getModelName(slug) {
        return modelNames[slug] || slug;
    }

    function toggleModel(model) {
        if (filters.models.includes(model)) {
            filters.models = filters.models.filter((m) => m !== model);
        } else {
            filters.models = [...filters.models, model];
        }
        dispatch("change", filters);
    }

    function toggleFeature(key) {
        filters[key] = filters[key] ? null : true;
        dispatch("change", filters);
    }

    function setDateFrom(e) {
        filters.dateFrom = e.target.value ? new Date(e.target.value) : null;
        dispatch("change", filters);
    }

    function setDateTo(e) {
        filters.dateTo = e.target.value ? new Date(e.target.value) : null;
        dispatch("change", filters);
    }

    function clearFilters() {
        filters = {
            models: [],
            hasImageGen: null,
            hasWebSearch: null,
            isDeepResearch: null,
            dateFrom: null,
            dateTo: null,
        };
        dispatch("change", filters);
    }

    function close() {
        dispatch("close");
    }

    $: hasActiveFilters =
        filters.models.length > 0 ||
        filters.hasImageGen ||
        filters.hasWebSearch ||
        filters.isDeepResearch ||
        filters.dateFrom ||
        filters.dateTo;

    $: activeFilterCount =
        filters.models.length +
        (filters.hasImageGen ? 1 : 0) +
        (filters.hasWebSearch ? 1 : 0) +
        (filters.isDeepResearch ? 1 : 0) +
        (filters.dateFrom || filters.dateTo ? 1 : 0);

    // Close on click outside
    let panelRef;
    function handleClickOutside(e) {
        if (panelRef && !panelRef.contains(e.target)) {
            close();
        }
    }

    onMount(() => {
        if (isOpen) {
            setTimeout(
                () => window.addEventListener("click", handleClickOutside),
                10,
            );
        }
        return () => window.removeEventListener("click", handleClickOutside);
    });
</script>

{#if isOpen}
    <div
        class="filter-popover"
        bind:this={panelRef}
        transition:fly={{ y: -10, duration: 200 }}
        on:click|stopPropagation
    >
        <!-- Header -->
        <div class="popover-header">
            <span class="popover-title">Filtros</span>
            {#if hasActiveFilters}
                <button class="clear-all" on:click={clearFilters}>
                    Limpar tudo
                </button>
            {/if}
            <button class="close-btn" on:click={close}>
                <X size={14} />
            </button>
        </div>

        <!-- Models Section -->
        <div class="filter-group">
            <div class="group-label">
                <Sparkles size={12} />
                Modelo
            </div>
            <div class="pill-grid">
                {#each availableModels as model}
                    <button
                        class="filter-pill"
                        class:active={filters.models.includes(model)}
                        on:click={() => toggleModel(model)}
                    >
                        <span
                            class="pill-dot"
                            class:active={filters.models.includes(model)}
                        ></span>
                        {getModelName(model)}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Features Section -->
        <div class="filter-group">
            <div class="group-label">
                <Filter size={12} />
                Contém
            </div>
            <div class="feature-row">
                <button
                    class="feature-pill"
                    class:active={filters.hasImageGen}
                    on:click={() => toggleFeature("hasImageGen")}
                >
                    <div class="feature-icon dalle">
                        <Image size={14} />
                    </div>
                    <span>DALL-E</span>
                </button>
                <button
                    class="feature-pill"
                    class:active={filters.isDeepResearch}
                    on:click={() => toggleFeature("isDeepResearch")}
                >
                    <div class="feature-icon research">
                        <Sparkles size={14} />
                    </div>
                    <span>Deep Research</span>
                </button>
                <button
                    class="feature-pill"
                    class:active={filters.hasWebSearch}
                    on:click={() => toggleFeature("hasWebSearch")}
                >
                    <div class="feature-icon web">
                        <Globe size={14} />
                    </div>
                    <span>Web</span>
                </button>
            </div>
        </div>

        <!-- Date Section -->
        <div class="filter-group">
            <div class="group-label">
                <Calendar size={12} />
                Período
            </div>
            <div class="date-row">
                <div class="date-input-wrap">
                    <input
                        type="date"
                        placeholder="De"
                        value={filters.dateFrom
                            ? filters.dateFrom.toISOString().split("T")[0]
                            : ""}
                        on:change={setDateFrom}
                    />
                </div>
                <span class="date-sep">→</span>
                <div class="date-input-wrap">
                    <input
                        type="date"
                        placeholder="Até"
                        value={filters.dateTo
                            ? filters.dateTo.toISOString().split("T")[0]
                            : ""}
                        on:change={setDateTo}
                    />
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .filter-popover {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;
        background: linear-gradient(
            180deg,
            rgba(24, 20, 32, 0.98),
            rgba(16, 14, 22, 0.98)
        );
        border: 1px solid rgba(139, 92, 246, 0.25);
        border-radius: 16px;
        padding: 0;
        z-index: 100;
        backdrop-filter: blur(20px);
        box-shadow:
            0 20px 40px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(139, 92, 246, 0.1) inset,
            0 0 60px rgba(139, 92, 246, 0.1);
        overflow: hidden;
    }

    .popover-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: linear-gradient(
            90deg,
            rgba(139, 92, 246, 0.1),
            transparent
        );
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .popover-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #a78bfa;
        flex: 1;
    }

    .clear-all {
        background: transparent;
        border: none;
        color: #888;
        font-size: 10px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
    }
    .clear-all:hover {
        color: #c4b5fd;
        background: rgba(139, 92, 246, 0.1);
    }

    .close-btn {
        background: transparent;
        border: none;
        color: #666;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }
    .close-btn:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
    }

    .filter-group {
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }
    .filter-group:last-child {
        border-bottom: none;
    }

    .group-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #666;
        margin-bottom: 10px;
    }

    .pill-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .filter-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 6px 12px;
        font-size: 11px;
        color: #999;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .filter-pill:hover {
        background: rgba(139, 92, 246, 0.1);
        border-color: rgba(139, 92, 246, 0.3);
        color: #c4b5fd;
        transform: translateY(-1px);
    }

    .filter-pill.active {
        background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.2),
            rgba(124, 58, 237, 0.15)
        );
        border-color: rgba(139, 92, 246, 0.5);
        color: #ede9fe;
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
    }

    .pill-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #444;
        transition: all 0.2s;
    }
    .pill-dot.active {
        background: linear-gradient(135deg, #a78bfa, #7c3aed);
        box-shadow: 0 0 8px rgba(167, 139, 250, 0.6);
    }

    .feature-row {
        display: flex;
        gap: 8px;
    }

    .feature-pill {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 12px 8px;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .feature-pill span {
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #666;
        transition: color 0.2s;
    }

    .feature-pill:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
    }

    .feature-pill.active {
        border-color: rgba(139, 92, 246, 0.4);
    }
    .feature-pill.active span {
        color: #c4b5fd;
    }

    .feature-icon {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.25s;
        color: #666;
    }

    .feature-icon.dalle {
        background: linear-gradient(
            135deg,
            rgba(236, 72, 153, 0.1),
            rgba(139, 92, 246, 0.1)
        );
    }
    .feature-pill.active .feature-icon.dalle {
        background: linear-gradient(
            135deg,
            rgba(236, 72, 153, 0.3),
            rgba(139, 92, 246, 0.3)
        );
        color: #f9a8d4;
        box-shadow: 0 0 20px rgba(236, 72, 153, 0.3);
    }

    .feature-icon.research {
        background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.1),
            rgba(56, 178, 172, 0.1)
        );
    }
    .feature-pill.active .feature-icon.research {
        background: linear-gradient(
            135deg,
            rgba(16, 185, 129, 0.3),
            rgba(56, 178, 172, 0.3)
        );
        color: #6ee7b7;
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
    }

    .feature-icon.web {
        background: linear-gradient(
            135deg,
            rgba(59, 130, 246, 0.1),
            rgba(99, 102, 241, 0.1)
        );
    }
    .feature-pill.active .feature-icon.web {
        background: linear-gradient(
            135deg,
            rgba(59, 130, 246, 0.3),
            rgba(99, 102, 241, 0.3)
        );
        color: #93c5fd;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
    }

    .date-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .date-input-wrap {
        flex: 1;
    }

    .date-input-wrap input {
        width: 100%;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 11px;
        color: #ccc;
        transition: all 0.2s;
    }

    .date-input-wrap input:focus {
        outline: none;
        border-color: rgba(139, 92, 246, 0.4);
        background: rgba(139, 92, 246, 0.05);
    }

    .date-input-wrap input::-webkit-calendar-picker-indicator {
        filter: invert(0.7);
        opacity: 0.6;
        cursor: pointer;
    }

    .date-sep {
        color: #444;
        font-size: 12px;
    }
</style>
