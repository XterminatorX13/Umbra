<script>
    import { X, ExternalLink, Globe, FileText } from "lucide-svelte";
    import { fade, fly } from "svelte/transition";
    import { createEventDispatcher } from "svelte";

    // Now accepts array of { url, title, snippet, domain, attribution }
    export let sources = [];
    export let isOpen = false;

    const dispatch = createEventDispatcher();

    function close() {
        dispatch("close");
    }

    function getFavicon(source) {
        try {
            const url = typeof source === "string" ? source : source.url;
            const domain = new URL(url).origin;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
            return null;
        }
    }

    // Normalize sources: support both URLs strings and rich objects
    function normalizeSource(source) {
        if (typeof source === "string") {
            let domain = "";
            try {
                domain = new URL(source).hostname.replace("www.", "");
            } catch {}
            return {
                url: source,
                title: domain,
                snippet: "",
                domain,
                attribution: domain,
            };
        }
        return source;
    }

    // Group normalized sources by domain
    $: normalizedSources = sources.map(normalizeSource);
    $: groupedSources = normalizedSources.reduce((acc, source) => {
        const domain = source.domain || "Unknown";
        if (!acc[domain]) acc[domain] = [];
        acc[domain].push(source);
        return acc;
    }, {});
</script>

{#if isOpen}
    <!-- Backdrop -->
    <div
        class="sources-backdrop"
        on:click={close}
        on:keydown={(e) => e.key === "Escape" && close()}
        transition:fade={{ duration: 200 }}
        role="button"
        tabindex="-1"
    ></div>

    <!-- Panel -->
    <div class="sources-panel" transition:fly={{ x: 300, duration: 300 }}>
        <header class="panel-header">
            <div class="header-title">
                <Globe size={18} />
                <h3>Sources ({normalizedSources.length})</h3>
            </div>
            <button class="close-btn" on:click={close}>
                <X size={18} />
            </button>
        </header>

        <div class="sources-list">
            {#each Object.entries(groupedSources) as [domain, domainSources]}
                <div class="domain-group">
                    <div class="domain-header">
                        <img
                            src={getFavicon(domainSources[0])}
                            alt=""
                            class="favicon"
                            on:error={(e) => (e.target.style.display = "none")}
                        />
                        <span class="domain-name">{domain}</span>
                        <span class="domain-count">{domainSources.length}</span>
                    </div>

                    <div class="domain-links">
                        {#each domainSources as source}
                            <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="source-link"
                                title={source.snippet || source.title}
                            >
                                <FileText size={14} />
                                <div class="link-content">
                                    <span class="link-title"
                                        >{source.title?.slice(0, 70) ||
                                            "Source"}</span
                                    >
                                    {#if source.snippet}
                                        <span class="link-snippet"
                                            >{source.snippet.slice(
                                                0,
                                                120,
                                            )}...</span
                                        >
                                    {/if}
                                </div>
                                <ExternalLink size={12} class="external-icon" />
                            </a>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .sources-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 9998;
    }

    .sources-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 460px;
        max-width: 90vw;
        height: 100vh;
        background: rgba(18, 16, 24, 0.95);
        backdrop-filter: blur(24px);
        border-left: 1px solid rgba(139, 92, 246, 0.2);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        box-shadow: -20px 0 60px rgba(0, 0, 0, 0.5);
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .header-title {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #fff;
    }

    .header-title h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
    }

    .close-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 8px;
        color: #888;
        cursor: pointer;
        transition: all 0.2s;
    }

    .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }

    .sources-list {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
    }

    .domain-group {
        margin-bottom: 20px;
    }

    .domain-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: rgba(139, 92, 246, 0.1);
        border-radius: 10px;
        margin-bottom: 10px;
    }

    .favicon {
        width: 18px;
        height: 18px;
        border-radius: 4px;
    }

    .domain-name {
        flex: 1;
        font-size: 14px;
        font-weight: 600;
        color: #c4b5fd;
    }

    .domain-count {
        font-size: 11px;
        color: #888;
        background: rgba(0, 0, 0, 0.3);
        padding: 3px 10px;
        border-radius: 12px;
    }

    .domain-links {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-left: 14px;
    }

    .source-link {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 14px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        color: #aaa;
        text-decoration: none;
        transition: all 0.2s;
        overflow: hidden;
    }

    .source-link:hover {
        background: rgba(139, 92, 246, 0.15);
        border-color: rgba(139, 92, 246, 0.3);
        color: #fff;
    }

    .link-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    .link-title {
        font-size: 13px;
        font-weight: 500;
        color: #e0e0e0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .link-snippet {
        font-size: 11px;
        color: #777;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .source-link:hover .link-title {
        color: #fff;
    }

    .source-link:hover .link-snippet {
        color: #aaa;
    }

    .source-link :global(.external-icon) {
        opacity: 0;
        transition: opacity 0.2s;
        flex-shrink: 0;
        margin-top: 2px;
    }

    .source-link:hover :global(.external-icon) {
        opacity: 1;
    }
</style>
