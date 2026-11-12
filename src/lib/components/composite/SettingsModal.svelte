<script>
    import { createEventDispatcher } from "svelte";
    import { X, HardDriveDownload, HardDriveUpload, FolderOpen, RefreshCw, Sparkles, KeyRound, Link2, Cpu } from "lucide-svelte";
    import { createBackup, restoreBackup, getLastBackupInfo } from "$lib/backup.js";
    import {
        providerSettingsView,
        loadProviderSettings,
        saveProviderSettings,
        currentModel,
        catalog,
    } from "$lib/ai/chatStore.js";

    export let isOpen = false;

    const dispatch = createEventDispatcher();

    let backingUp = false;
    let restoring = false;
    let status = null; // { type: 'success' | 'error' | 'info', message }
    let lastBackup = getLastBackupInfo();
    let pickedFile = null;
    let restoreArmed = false;
    let armTimeout = null;
    let fileInputEl;

    // ── IA providers ──
    const PROVIDERS = [
        {
            id: "openrouter",
            label: "OpenRouter",
            hint: "Agregador com 300+ modelos (vários grátis). Chave em openrouter.ai/keys",
            kind: "key",
        },
        {
            id: "openai",
            label: "OpenAI",
            hint: "Chave em platform.openai.com/api-keys",
            kind: "key",
        },
        {
            id: "anthropic",
            label: "Anthropic",
            hint: "Chave em console.anthropic.com/settings/keys",
            kind: "key",
        },
        {
            id: "google",
            label: "Google AI Studio",
            hint: "Chave em aistudio.google.com/apikey",
            kind: "key",
        },
        {
            id: "ollama",
            label: "Ollama (local)",
            hint: "Modelos locais na sua máquina — ollama.com. Sem chave.",
            kind: "baseurl",
            baseUrlPlaceholder: "http://localhost:11434",
        },
        {
            id: "omniroute",
            label: "OmniRoute (gateway)",
            hint: "Gateway local open-source. Chave no Dashboard → Endpoints. Modelo 'auto' usa free tiers.",
            kind: "baseurl+key",
            baseUrlPlaceholder: "http://localhost:20128",
        },
    ];

    let keyDrafts = {}; // {providerId: string digitada}
    let baseUrlDrafts = {}; // {providerId: string}
    let providerStatus = {}; // {providerId: {type, message}}
    let providersLoading = false;

    $: if (isOpen) {
        status = null;
        pickedFile = null;
        disarmRestore();
        lastBackup = getLastBackupInfo();
        keyDrafts = {};
        providerStatus = {};
        refreshProviderView();
    }

    async function refreshProviderView() {
        providersLoading = true;
        try {
            await loadProviderSettings();
            baseUrlDrafts = {
                ollama: $providerSettingsView?.ollama?.baseUrl || "http://localhost:11434",
                omniroute: $providerSettingsView?.omniroute?.baseUrl || "http://localhost:20128",
            };
        } finally {
            providersLoading = false;
        }
    }

    async function handleSaveProvider(id) {
        const patch = {};
        if (id === "ollama") {
            patch.baseUrl = (baseUrlDrafts[id] || "").trim();
        } else if (id === "omniroute") {
            patch.baseUrl = (baseUrlDrafts[id] || "").trim();
            const key = (keyDrafts[id] || "").trim();
            if (key) patch.apiKey = key;
        } else {
            const key = (keyDrafts[id] || "").trim();
            if (!key) {
                providerStatus = {
                    ...providerStatus,
                    [id]: { type: "error", message: "Digite uma chave para salvar." },
                };
                return;
            }
            patch.apiKey = key;
        }
        try {
            await saveProviderSettings({ providers: { [id]: patch } });
            keyDrafts = { ...keyDrafts, [id]: "" };
            providerStatus = {
                ...providerStatus,
                [id]: { type: "success", message: "Configuração salva." },
            };
        } catch (e) {
            providerStatus = {
                ...providerStatus,
                [id]: { type: "error", message: e.message || "Falha ao salvar." },
            };
        }
    }

    // Modelo padrão atual (spec + catálogo)
    $: defaultModelLabel = (() => {
        const spec = $currentModel;
        if (!spec?.modelId) return null;
        const meta = ($catalog.providers?.[spec.providerId] || []).find(
            (m) => m.id === spec.modelId,
        );
        return meta?.name || spec.modelId;
    })();

    function disarmRestore() {
        restoreArmed = false;
        if (armTimeout) clearTimeout(armTimeout);
    }

    function close() {
        disarmRestore();
        isOpen = false;
        dispatch("close");
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) close();
    }

    function handleKeydown(e) {
        if (e.key === "Escape" && isOpen) {
            e.stopPropagation();
            close();
        }
    }

    async function handleBackup() {
        backingUp = true;
        status = null;
        try {
            const { path, counts } = await createBackup();
            lastBackup = getLastBackupInfo();
            status = {
                type: "success",
                message: `Backup criado: ${counts.conversations} conversas e ${counts.messages} mensagens.`,
            };
        } catch (e) {
            status = { type: "error", message: e.message || "Falha ao criar o backup." };
        } finally {
            backingUp = false;
            disarmRestore();
            pickedFile = null;
        }
    }

    function handleFilePick(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        pickedFile = file;
        restoreArmed = true;
        status = {
            type: "info",
            message: `Restaurar ${file.name}? Isto mescla o backup no acervo atual.`,
        };
        if (armTimeout) clearTimeout(armTimeout);
        armTimeout = setTimeout(() => {
            restoreArmed = false;
            pickedFile = null;
            status = null;
        }, 6000);
        e.target.value = "";
    }

    async function handleRestore() {
        if (!pickedFile) return;
        restoring = true;
        status = null;
        try {
            const counts = await restoreBackup(pickedFile);
            status = {
                type: "success",
                message: `Restaurado: ${counts.conversations} conversas. Recarregando...`,
            };
            setTimeout(() => location.reload(), 1200);
        } catch (e) {
            status = { type: "error", message: e.message || "Falha ao restaurar o backup." };
            restoring = false;
            disarmRestore();
            pickedFile = null;
        }
    }

    async function handleOpenFolder() {
        try {
            await window.electronAPI?.openBackupsFolder?.();
        } catch {
            status = { type: "error", message: "Não foi possível abrir a pasta de backups." };
        }
    }

    function formatDate(iso) {
        try {
            return new Date(iso).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return iso;
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="settings-overlay" on:click={handleBackdropClick} role="presentation">
        <div class="settings-modal" on:click|stopPropagation role="dialog" aria-modal="true">
            <button class="close-btn" on:click={close} aria-label="Fechar configurações">
                <X size={18} />
            </button>

            <h2 class="settings-title">Configurações</h2>

            <section class="settings-section">
                <h3 class="section-title">
                    <Sparkles size={16} />
                    IA — Providers
                </h3>
                <p class="section-description">
                    Configure quantos providers quiser e troque de modelo no chat.
                    As chaves ficam no processo principal, nunca no renderer.
                    O catálogo (models.dev + Ollama + OmniRoute) é atualizado a cada 24h.
                </p>

                {#if defaultModelLabel}
                    <div class="last-backup">
                        <span class="last-backup-label">Modelo padrão:</span>
                        {defaultModelLabel}
                        <span class="last-backup-counts">(troque pelo seletor no campo de mensagem do chat)</span>
                    </div>
                {/if}

                {#if providersLoading}
                    <p class="section-description">Carregando configurações...</p>
                {:else}
                    <div class="providers-list">
                        {#each PROVIDERS as prov (prov.id)}
                            <div class="provider-card">
                                <div class="provider-head">
                                    <span class="provider-name">{prov.label}</span>
                                    {#if $providerSettingsView?.[prov.id]?.configured}
                                        <span class="provider-badge ok">configurado</span>
                                    {:else}
                                        <span class="provider-badge">não configurado</span>
                                    {/if}
                                </div>
                                <p class="provider-hint">{prov.hint}</p>

                                {#if prov.kind === "baseurl" || prov.kind === "baseurl+key"}
                                    <div class="provider-input-row">
                                        <Link2 size={13} class="provider-input-icon" />
                                        <input
                                            type="url"
                                            class="provider-input"
                                            bind:value={baseUrlDrafts[prov.id]}
                                            placeholder={prov.baseUrlPlaceholder}
                                            spellcheck="false"
                                        />
                                    </div>
                                {/if}
                                {#if prov.kind === "key" || prov.kind === "baseurl+key"}
                                    <div class="provider-input-row">
                                        <KeyRound size={13} class="provider-input-icon" />
                                        <input
                                            type="password"
                                            class="provider-input"
                                            bind:value={keyDrafts[prov.id]}
                                            placeholder={$providerSettingsView?.[prov.id]?.configured
                                                ? "(Configurado — digite para alterar)"
                                                : "cole a chave aqui"}
                                            autocomplete="off"
                                        />
                                    </div>
                                {/if}
                                {#if prov.id === "ollama"}
                                    <div class="provider-input-row provider-input-row--bare">
                                        <Cpu size={13} class="provider-input-icon" />
                                        <span class="provider-inline-hint">
                                            Instâncias locais não precisam de chave.
                                        </span>
                                    </div>
                                {/if}

                                <div class="provider-actions">
                                    <button
                                        class="btn btn-ghost btn-sm"
                                        on:click={() => handleSaveProvider(prov.id)}
                                    >
                                        Salvar
                                    </button>
                                    {#if providerStatus[prov.id]}
                                        <span class="provider-status status-{providerStatus[prov.id].type}">
                                            {providerStatus[prov.id].message}
                                        </span>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </section>

            <div class="section-divider"></div>

            <section class="settings-section">
                <h3 class="section-title">
                    <HardDriveDownload size={16} />
                    Backup do acervo
                </h3>
                <p class="section-description">
                    Exporta todas as conversas, mensagens e metadados para um arquivo
                    <code>.zip</code> na pasta de backups do app. Um backup automático
                    semanal roda ao abrir o app.
                </p>

                <div class="last-backup">
                    {#if lastBackup}
                        <span class="last-backup-label">Último backup:</span>
                        {formatDate(lastBackup.at)}
                        <span class="last-backup-counts">
                            ({lastBackup.counts?.conversations ?? 0} conversas,
                            {lastBackup.counts?.messages ?? 0} mensagens)
                        </span>
                    {:else}
                        <span class="last-backup-label">Nenhum backup criado ainda.</span>
                    {/if}
                </div>

                <div class="button-row">
                    <button class="btn btn-primary" on:click={handleBackup} disabled={backingUp}>
                        {#if backingUp}
                            <RefreshCw size={14} class="spin" />
                            Exportando...
                        {:else}
                            <HardDriveDownload size={14} />
                            Exportar backup agora
                        {/if}
                    </button>

                    <button class="btn btn-ghost" on:click={() => fileInputEl?.click()}>
                        <HardDriveUpload size={14} />
                        Restaurar de arquivo...
                    </button>

                    <button class="btn btn-ghost" on:click={handleOpenFolder}>
                        <FolderOpen size={14} />
                        Abrir pasta
                    </button>
                </div>

                {#if restoreArmed && pickedFile}
                    <div class="confirm-row">
                        <button class="btn btn-danger" on:click={handleRestore} disabled={restoring}>
                            {#if restoring}
                                <RefreshCw size={14} class="spin" />
                                Restaurando...
                            {:else}
                                Confirmar restauração
                            {/if}
                        </button>
                        <button
                            class="btn btn-ghost"
                            on:click={() => {
                                pickedFile = null;
                                disarmRestore();
                                status = null;
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                {/if}

                <input
                    type="file"
                    accept=".zip"
                    class="hidden-input"
                    bind:this={fileInputEl}
                    on:change={handleFilePick}
                />

                {#if status}
                    <p class="status status-{status.type}">{status.message}</p>
                {/if}
            </section>
        </div>
    </div>
{/if}

<style>
    .settings-overlay {
        position: fixed;
        inset: 0;
        z-index: 60;
        background: rgba(5, 5, 8, 0.85);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.15s ease-out;
    }

    .settings-modal {
        position: relative;
        width: min(520px, calc(100vw - 48px));
        max-height: 85vh;
        overflow-y: auto;
        background: var(--bg-panel);
        border: 1px solid var(--border-light);
        border-radius: var(--radius);
        padding: 24px;
        box-shadow: 0 8px 30px rgba(199, 125, 255, 0.15);
    }

    .close-btn {
        position: absolute;
        top: 14px;
        right: 14px;
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border-radius: var(--radius-small);
        color: var(--color-text-secondary, #b8b8c8);
        background: transparent;
        border: none;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
    }

    .close-btn:hover {
        background: var(--layer-2);
        color: var(--color-text-primary, #f0f0f5);
    }

    .settings-title {
        margin: 0 0 20px;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--color-text-primary, #f0f0f5);
    }

    .settings-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--color-text-primary, #f0f0f5);
    }

    .section-title :global(svg) {
        color: var(--highlight);
    }

    .section-description {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.5;
        color: var(--color-text-secondary, #b8b8c8);
    }

    .section-description code {
        font-family: var(--font-mono);
        font-size: 0.8rem;
        color: var(--highlight);
    }

    .last-backup {
        font-size: 0.8rem;
        color: var(--color-text-secondary, #b8b8c8);
        padding: 8px 12px;
        background: var(--layer-1);
        border: 1px solid var(--border);
        border-radius: var(--radius-small);
    }

    .last-backup-label {
        color: var(--highlight);
        font-weight: 500;
        margin-right: 4px;
    }

    .last-backup-counts {
        opacity: 0.7;
    }

    .section-divider {
        height: 1px;
        background: var(--border);
        margin: 20px 0;
    }

    .providers-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .provider-card {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 12px;
        background: var(--layer-1);
        border: 1px solid var(--border);
        border-radius: var(--radius-small);
    }

    .provider-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    .provider-name {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text-primary, #f0f0f5);
    }

    .provider-badge {
        font-size: 0.68rem;
        padding: 2px 8px;
        border-radius: 999px;
        border: 1px solid var(--border-light);
        color: var(--color-text-secondary, #b8b8c8);
    }

    .provider-badge.ok {
        color: #4ade80;
        border-color: rgba(74, 222, 128, 0.4);
        background: rgba(74, 222, 128, 0.08);
    }

    .provider-hint {
        margin: 0;
        font-size: 0.75rem;
        line-height: 1.4;
        color: var(--color-text-secondary, #b8b8c8);
        opacity: 0.85;
    }

    .provider-input-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        background: rgba(10, 10, 15, 0.4);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-small);
    }

    .provider-input-row:focus-within {
        border-color: rgba(157, 78, 221, 0.5);
    }

    .provider-input-icon {
        color: var(--highlight);
        flex-shrink: 0;
    }

    .provider-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--color-text-primary, #f0f0f5);
        font-size: 0.8rem;
        font-family: inherit;
        min-width: 0;
    }

    .provider-input::placeholder {
        color: var(--color-text-secondary, #b8b8c8);
        opacity: 0.55;
    }

    .provider-input-row--bare {
        background: transparent;
        border: none;
        padding: 0 2px;
    }

    .provider-inline-hint {
        font-size: 0.72rem;
        color: var(--color-text-secondary, #b8b8c8);
        opacity: 0.8;
    }

    .provider-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 2px;
    }

    .btn-sm {
        padding: 5px 12px;
        font-size: 0.78rem;
    }

    .provider-status {
        font-size: 0.72rem;
        line-height: 1.3;
    }

    .button-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        font-size: 0.85rem;
        font-weight: 500;
        border-radius: var(--radius-small);
        border: 1px solid transparent;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s, opacity 0.15s;
        color: var(--color-text-primary, #f0f0f5);
    }

    .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .btn-primary {
        background: var(--accent-1);
        border-color: var(--border-focus);
    }

    .btn-primary:hover:not(:disabled) {
        background: var(--accent-2);
    }

    .btn-ghost {
        background: var(--layer-2);
        border-color: var(--border-light);
    }

    .btn-ghost:hover:not(:disabled) {
        background: var(--layer-3);
    }

    .btn-danger {
        background: rgba(220, 38, 38, 0.2);
        border-color: rgba(220, 38, 38, 0.5);
        color: #fecaca;
    }

    .btn-danger:hover:not(:disabled) {
        background: rgba(220, 38, 38, 0.35);
    }

    .confirm-row {
        display: flex;
        gap: 8px;
    }

    .hidden-input {
        display: none;
    }

    .status {
        margin: 0;
        font-size: 0.8rem;
        line-height: 1.4;
        padding: 8px 12px;
        border-radius: var(--radius-small);
        border: 1px solid;
    }

    .status-success {
        color: #bbf7d0;
        background: rgba(34, 197, 94, 0.1);
        border-color: rgba(34, 197, 94, 0.35);
    }

    .status-error {
        color: #fecaca;
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.35);
    }

    .status-info {
        color: var(--highlight);
        background: rgba(199, 125, 255, 0.08);
        border-color: var(--border-focus);
    }

    .spin {
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
</style>
