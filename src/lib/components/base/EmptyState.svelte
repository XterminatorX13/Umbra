<script>
    import { createEventDispatcher } from "svelte";
    import {
        Sparkles,
        Star,
        BarChart3,
        Upload,
        Command,
        FolderOpen,
    } from "lucide-svelte";
    import TextGradient from "$lib/components/base/TextGradient.svelte";
    import SparkBadge from "$lib/components/base/SparkBadge.svelte";
    import GlitchButton from "$lib/components/base/GlitchButton.svelte";

    const dispatch = createEventDispatcher();

    function goToFavorites() {
        dispatch("navigate", { route: "favorites" });
    }

    function goToStats() {
        dispatch("navigate", { route: "stats" });
    }

    function goToAll() {
        dispatch("navigate", { route: "all" });
    }

    function openFilePicker() {
        dispatch("openFilePicker");
    }
</script>

<div class="empty-state aurora-bg noise-overlay">
    <!-- Meteors Background -->
    <div class="meteors">
        {#each Array(8) as _, i}
            <div
                class="meteor"
                style="--delay: {i * 0.4}s; --top: {10 + i * 10}%; --left: {5 +
                    i * 12}%;"
            ></div>
        {/each}
    </div>

    <!-- Content -->
    <div class="content animate-slide-up">
        <div class="icon-glow">
            <Sparkles size={48} strokeWidth={1.5} />
        </div>

        <TextGradient text="Dark Aurora" as="h2" />
        <SparkBadge text="PKM Edition" className="mb-4" />
        <p class="subtitle">Seu PKM pessoal para conversas do ChatGPT</p>

        <!-- Action Buttons -->
        <div class="action-btn-group">
            <GlitchButton
                on:click={openFilePicker}
                size="lg"
                variant="primary"
                className="w-full"
            >
                <Upload size={18} />
                Arrastar conversations.json aqui
            </GlitchButton>

            <GlitchButton
                on:click={goToFavorites}
                size="md"
                variant="secondary"
                className="w-full"
            >
                <Star size={16} />
                Ver Favoritos
            </GlitchButton>

            <GlitchButton
                on:click={goToStats}
                size="md"
                variant="secondary"
                className="w-full"
            >
                <BarChart3 size={16} />
                Estatísticas
            </GlitchButton>

            <GlitchButton
                on:click={goToAll}
                size="md"
                variant="secondary"
                className="w-full"
            >
                <FolderOpen size={16} />
                Ver Todas as Conversas
            </GlitchButton>
        </div>

        <!-- Keyboard Hint -->
        <div class="kbd-hint">
            <Command size={12} />
            <span>Pressione <kbd>Ctrl+K</kbd> para buscar</span>
        </div>
    </div>
</div>

<style>
    .empty-state {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-deep);
        overflow: hidden;
    }

    /* Meteors Animation */
    .meteors {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
    }

    .meteor {
        position: absolute;
        top: var(--top);
        left: var(--left);
        width: 2px;
        height: 80px;
        background: linear-gradient(to bottom, var(--highlight), transparent);
        border-radius: 999px;
        transform: rotate(-45deg);
        animation: meteor 4s linear infinite;
        animation-delay: var(--delay);
        opacity: 0;
    }

    @keyframes meteor {
        0% {
            transform: translateX(0) translateY(0) rotate(-45deg);
            opacity: 0;
        }
        10% {
            opacity: 1;
        }
        70% {
            opacity: 0.5;
        }
        100% {
            transform: translateX(400px) translateY(400px) rotate(-45deg);
            opacity: 0;
        }
    }

    /* Content */
    .content {
        position: relative;
        z-index: 1;
        text-align: center;
        padding: 40px;
        animation: fadeIn 0.6s ease-out;
        max-width: 400px;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .action-btn-group {
        display: flex;
        flex-direction: column;
        gap: 12px; /* Espaçamento mais clean */
        width: 100%;
        margin-top: 10px;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .icon-glow {
        display: inline-flex;
        padding: 20px;
        border-radius: 50%;
        background: radial-gradient(
            circle,
            rgba(157, 78, 221, 0.2) 0%,
            transparent 70%
        );
        color: var(--highlight);
        margin-bottom: 24px;
        animation: pulse 3s ease-in-out infinite;
    }

    @keyframes pulse {
        0%,
        100% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.05);
            opacity: 0.8;
        }
    }

    .subtitle {
        color: var(--color-text-secondary);
        font-size: 14px;
        margin-bottom: 32px;
    }

    /* Keyboard Hint */
    .kbd-hint {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-top: 32px;
        padding: 8px 16px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--border);
        border-radius: 999px;
        color: var(--color-text-tertiary);
        font-size: 11px;
    }

    .kbd-hint kbd {
        padding: 2px 6px;
        background: var(--layer-2);
        border: 1px solid var(--border-light);
        border-radius: 4px;
        font-size: 10px;
        font-family: var(--font-mono);
        color: var(--color-text-secondary);
    }
</style>
