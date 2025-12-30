<script>
    import { fade, fly } from "svelte/transition";
    import { onMount } from "svelte";
    import { portal } from "../actions.js";
    import { Sparkles, ArrowRight } from "lucide-svelte";

    export let concept = "";
    export let x = 0;
    export let y = 0;
    export let isOpen = false;

    // This would eventually query the DB for related content
    // For now, it shows a "stub" of what transclusion will be
    const stubContent = {
        "Redes Neurais":
            "Sistemas computacionais inspirados nas redes neurais biológicas que constituem os cérebros animais.",
        "Deep Learning":
            "Parte de uma família mais ampla de métodos de aprendizado de máquina baseados em redes neurais artificiais.",
        Aurora: "Um sistema operacional de gestão de conhecimento pessoal focado em estender a mente humana.",
    };

    $: definition =
        stubContent[concept] ||
        `Clique para criar uma nota sobre "${concept}" ou buscar referências.`;

    // Adjust position to stay on screen
    let adjustedX = x;
    let adjustedY = y;

    $: {
        if (x + 300 > window.innerWidth) {
            adjustedX = x - 300;
        } else {
            adjustedX = x;
        }

        if (y + 150 > window.innerHeight) {
            adjustedY = y - 160;
        } else {
            adjustedY = y + 20;
        }
    }
</script>

{#if isOpen}
    <div
        class="hover-preview"
        style="top: {adjustedY}px; left: {adjustedX}px"
        use:portal
        transition:fly={{ y: 5, duration: 200 }}
    >
        <div class="preview-header">
            <span class="preview-title">
                <Sparkles size={12} class="text-violet-400" />
                {concept}
            </span>
            <span class="preview-type">Conceito</span>
        </div>

        <div class="preview-body">
            {definition}
        </div>

        <div class="preview-footer">
            <span class="footer-action"
                >Ver conexões <ArrowRight size={10} /></span
            >
        </div>
    </div>
{/if}

<style>
    .hover-preview {
        position: fixed;
        width: 280px;
        background: rgba(18, 18, 20, 0.95);
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 12px;
        padding: 0;
        z-index: 9999;
        backdrop-filter: blur(12px);
        box-shadow:
            0 4px 20px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        pointer-events: none; /* Let clicks pass through if needed, or set auto if interactive */
        overflow: hidden;
    }

    .preview-header {
        padding: 10px 12px;
        background: rgba(139, 92, 246, 0.1);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .preview-title {
        font-size: 13px;
        font-weight: 600;
        color: #e4e4e7;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .preview-type {
        font-size: 10px;
        color: #a1a1aa;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        background: rgba(255, 255, 255, 0.05);
        padding: 2px 6px;
        border-radius: 4px;
    }

    .preview-body {
        padding: 12px;
        font-size: 12px;
        color: #d4d4d8;
        line-height: 1.5;
    }

    .preview-footer {
        padding: 8px 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        justify-content: flex-end;
    }

    .footer-action {
        font-size: 10px;
        color: #a78bfa;
        display: flex;
        align-items: center;
        gap: 4px;
    }
</style>
