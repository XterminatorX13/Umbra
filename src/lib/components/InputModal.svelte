<script>
    import { createEventDispatcher } from "svelte";

    export let isOpen = false;
    export let title = "";
    export let placeholder = "";
    export let defaultValue = "";
    export let submitLabel = "OK";
    export let cancelLabel = "Cancelar";

    const dispatch = createEventDispatcher();

    let value = defaultValue;
    let inputEl;

    $: if (isOpen && inputEl) {
        value = defaultValue;
        setTimeout(() => inputEl?.focus(), 50);
    }

    function handleSubmit() {
        dispatch("submit", { value: value.trim() });
        isOpen = false;
    }

    function handleCancel() {
        dispatch("cancel");
        isOpen = false;
    }

    function handleKeydown(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === "Escape") {
            e.preventDefault();
            handleCancel();
        }
    }
</script>

{#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-overlay" on:click={handleCancel}>
        <div class="modal-content" on:click|stopPropagation>
            <div class="modal-title">{title}</div>
            <input
                bind:this={inputEl}
                bind:value
                type="text"
                {placeholder}
                on:keydown={handleKeydown}
                class="modal-input"
            />
            <div class="modal-actions">
                <button class="modal-btn cancel" on:click={handleCancel}>
                    {cancelLabel}
                </button>
                <button class="modal-btn submit" on:click={handleSubmit}>
                    {submitLabel}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .modal-content {
        background: var(--bg-panel);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-large);
        padding: 20px;
        min-width: 320px;
        max-width: 90vw;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
        animation: slideIn 0.2s ease-out;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .modal-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-primary);
        margin-bottom: 16px;
    }

    .modal-input {
        width: 100%;
        padding: 12px 14px;
        font-size: 14px;
        background: var(--layer-1);
        border: 1px solid var(--border);
        border-radius: var(--radius-small);
        color: var(--color-text-primary);
        outline: none;
        transition: all 0.2s;
    }

    .modal-input:focus {
        border-color: var(--highlight);
        box-shadow: 0 0 0 3px rgba(157, 78, 221, 0.15);
    }

    .modal-input::placeholder {
        color: var(--color-text-tertiary);
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
    }

    .modal-btn {
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 500;
        border-radius: var(--radius-small);
        border: none;
        cursor: pointer;
        transition: all 0.2s;
    }

    .modal-btn.cancel {
        background: var(--layer-2);
        color: var(--color-text-secondary);
    }

    .modal-btn.cancel:hover {
        background: var(--layer-3);
        color: var(--color-text-primary);
    }

    .modal-btn.submit {
        background: var(--gradient-primary);
        color: white;
    }

    .modal-btn.submit:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(157, 78, 221, 0.4);
    }
</style>
