<script>
    import { Sparkles, MessageSquare, Upload, Command } from "lucide-svelte";
    import TextGradient from "./TextGradient.svelte";
    import SparkBadge from "./SparkBadge.svelte";
</script>

<div class="empty-state">
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
    <div class="content">
        <div class="icon-glow">
            <Sparkles size={48} strokeWidth={1.5} />
        </div>

        <TextGradient text="Dark Aurora" as="h2" />
        <SparkBadge text="PKM Edition" className="mb-4" />
        <p class="subtitle">Seu PKM pessoal para conversas do ChatGPT</p>

        <div class="tips">
            <div class="tip">
                <Upload size={16} />
                <span>Arraste seu <strong>conversations.json</strong> aqui</span
                >
            </div>
            <div class="tip">
                <Command size={16} />
                <span>Pressione <kbd>Ctrl+K</kbd> para buscar</span>
            </div>
            <div class="tip">
                <MessageSquare size={16} />
                <span>Selecione uma conversa na sidebar</span>
            </div>
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
        margin-bottom: 40px;
    }

    .tips {
        display: flex;
        flex-direction: column;
        gap: 16px;
        align-items: center;
    }

    .tip {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 24px;
        background: var(--layer-1);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--color-text-secondary);
        font-size: 13px;
        transition: all 0.2s;
    }

    .tip:hover {
        background: var(--layer-2);
        border-color: var(--border-light);
        transform: translateX(4px);
    }

    .tip strong {
        color: var(--highlight);
    }

    .tip kbd {
        padding: 4px 8px;
        background: var(--bg-deep);
        border-radius: 4px;
        font-size: 11px;
        font-family: var(--font-mono);
    }
</style>
