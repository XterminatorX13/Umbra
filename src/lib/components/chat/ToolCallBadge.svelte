<script>
    export let toolCalls = [];
</script>

{#if toolCalls.length > 0}
    <div class="tool-calls-container">
        <div class="tool-calls-header">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <polyline points="4 17 10 11 4 5"></polyline>
                <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
            <span>Chamadas de Ferramentas ({toolCalls.length})</span>
        </div>
        {#each toolCalls as call}
            <details class="tool-call-item">
                <summary>
                    <span class="tool-name">{call.name}</span>
                    <span class="tool-type">{call.type}</span>
                </summary>
                <pre class="tool-arguments">{typeof call.arguments === "string"
                        ? call.arguments
                        : JSON.stringify(call.arguments, null, 2)}</pre>
            </details>
        {/each}
    </div>
{/if}

<style>
    .tool-calls-container {
        margin-top: 12px;
        padding: 12px;
        background: rgba(139, 92, 246, 0.08);
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 8px;
    }

    .tool-calls-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--color-accent, #8b5cf6);
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 8px;
    }

    .tool-call-item {
        margin-bottom: 6px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        overflow: hidden;
    }

    .tool-call-item summary {
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--color-text-secondary, #9ca3af);
        transition: background 0.15s;
    }

    .tool-call-item summary:hover {
        background: rgba(139, 92, 246, 0.15);
    }

    .tool-name {
        color: var(--color-accent, #8b5cf6);
        font-weight: 500;
        font-family: "JetBrains Mono", "Fira Code", monospace;
    }

    .tool-type {
        font-size: 10px;
        padding: 2px 6px;
        background: rgba(139, 92, 246, 0.2);
        border-radius: 4px;
        color: var(--color-text-muted, #6b7280);
    }

    .tool-arguments {
        margin: 0;
        padding: 12px;
        background: rgba(0, 0, 0, 0.3);
        font-size: 11px;
        font-family: "JetBrains Mono", "Fira Code", monospace;
        color: var(--color-text-secondary, #9ca3af);
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
    }
</style>
