<script>
    import { parseMarkdown } from "../../utils/markdown.js";
    import { FileText, Code, Copy, ChevronRight, X } from "lucide-svelte";
    import { fly, fade } from "svelte/transition";

    export let canvas = null;
    export let onClose = () => {};

    $: renderedContent = canvas?.content ? parseMarkdown(canvas.content) : "";

    let copySuccess = false;

    function copyContent() {
        if (canvas?.content) {
            navigator.clipboard.writeText(canvas.content).then(() => {
                copySuccess = true;
                setTimeout(() => (copySuccess = false), 2000);
            });
        }
    }
</script>

{#if canvas}
    <div class="canvas-viewer" transition:fly={{ x: 300, duration: 300 }}>
        <!-- Header -->
        <div class="canvas-header">
            <div class="canvas-title-row">
                {#if canvas.type === "document"}
                    <FileText size={18} class="text-violet-400" />
                {:else}
                    <Code size={18} class="text-orange-400" />
                {/if}
                <div class="canvas-meta">
                    <h3 class="canvas-name">{canvas.name}</h3>
                    <span class="canvas-type"
                        >{canvas.type === "document"
                            ? "Documento"
                            : "Código"}</span
                    >
                </div>
            </div>
            <div class="canvas-actions">
                <button
                    class="action-btn"
                    on:click={copyContent}
                    title="Copiar conteúdo"
                >
                    {#if copySuccess}
                        ✓
                    {:else}
                        <Copy size={14} />
                    {/if}
                </button>
                <button
                    class="action-btn close"
                    on:click={onClose}
                    title="Fechar"
                >
                    <X size={14} />
                </button>
            </div>
        </div>

        <!-- Content -->
        <div class="canvas-content prose-invert custom-scrollbar">
            {@html renderedContent}
        </div>
    </div>
{/if}

<style>
    .canvas-viewer {
        position: absolute;
        top: 0;
        right: 0;
        width: 50%;
        max-width: 600px;
        height: 100%;
        background: var(--bg-deep, #0a0a0a);
        border-left: 1px solid rgba(139, 92, 246, 0.3);
        display: flex;
        flex-direction: column;
        z-index: 50;
        box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
    }

    .canvas-header {
        padding: 16px 20px;
        background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.1),
            rgba(139, 92, 246, 0.05)
        );
        border-bottom: 1px solid rgba(139, 92, 246, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
    }

    .canvas-title-row {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .canvas-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .canvas-name {
        font-size: 15px;
        font-weight: 600;
        color: var(--color-text-primary, #e4e4e7);
        margin: 0;
        line-height: 1.2;
    }

    .canvas-type {
        font-size: 11px;
        color: var(--color-text-muted, #71717a);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .canvas-actions {
        display: flex;
        gap: 8px;
    }

    .action-btn {
        width: 32px;
        height: 32px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-secondary, #9ca3af);
        cursor: pointer;
        transition: all 0.2s;
    }

    .action-btn:hover {
        background: rgba(139, 92, 246, 0.2);
        border-color: rgba(139, 92, 246, 0.4);
        color: #a78bfa;
    }

    .action-btn.close:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.4);
        color: #f87171;
    }

    .canvas-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        font-size: 14px;
        line-height: 1.7;
        color: var(--color-text-secondary, #d4d4d8);
    }

    .canvas-content :global(h1) {
        font-size: 1.5em;
        margin-top: 24px;
        margin-bottom: 12px;
        color: var(--color-text-primary, #fafafa);
        border-bottom: 1px solid rgba(139, 92, 246, 0.2);
        padding-bottom: 8px;
    }

    .canvas-content :global(h2) {
        font-size: 1.25em;
        margin-top: 20px;
        margin-bottom: 10px;
        color: var(--color-text-primary, #fafafa);
    }

    .canvas-content :global(h3) {
        font-size: 1.1em;
        margin-top: 16px;
        margin-bottom: 8px;
        color: #a78bfa;
    }

    .canvas-content :global(table) {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        font-size: 12px;
    }

    .canvas-content :global(th),
    .canvas-content :global(td) {
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 8px;
        text-align: left;
    }

    .canvas-content :global(th) {
        background: rgba(139, 92, 246, 0.15);
        font-weight: 600;
    }

    .canvas-content :global(code) {
        background: rgba(0, 0, 0, 0.4);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.9em;
    }

    .canvas-content :global(pre) {
        background: rgba(0, 0, 0, 0.5);
        padding: 16px;
        border-radius: 8px;
        overflow-x: auto;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .canvas-content :global(blockquote) {
        border-left: 3px solid #a78bfa;
        padding-left: 16px;
        margin: 16px 0;
        color: #9ca3af;
        font-style: italic;
    }
</style>
