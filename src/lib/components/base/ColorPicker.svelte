<script>
    import { createEventDispatcher } from "svelte";

    export let isOpen = false;
    export let selectedColor = "#7c3aed";

    const dispatch = createEventDispatcher();

    // Paleta premium de cores harmoniosas
    const colorPalette = [
        // Roxos (tema principal)
        { hex: "#7c3aed", name: "Violet" },
        { hex: "#8b5cf6", name: "Purple" },
        { hex: "#a78bfa", name: "Lavender" },
        { hex: "#c4b5fd", name: "Lilac" },

        // Blues
        { hex: "#3b82f6", name: "Blue" },
        { hex: "#0ea5e9", name: "Sky" },
        { hex: "#06b6d4", name: "Cyan" },
        { hex: "#14b8a6", name: "Teal" },

        // Greens
        { hex: "#10b981", name: "Emerald" },
        { hex: "#22c55e", name: "Green" },
        { hex: "#84cc16", name: "Lime" },
        { hex: "#a3e635", name: "Chartreuse" },

        // Warm colors
        { hex: "#eab308", name: "Yellow" },
        { hex: "#f59e0b", name: "Amber" },
        { hex: "#f97316", name: "Orange" },
        { hex: "#ef4444", name: "Red" },

        // Pinks
        { hex: "#ec4899", name: "Pink" },
        { hex: "#d946ef", name: "Fuchsia" },
        { hex: "#f472b6", name: "Rose" },
        { hex: "#fb7185", name: "Coral" },

        // Neutrals
        { hex: "#64748b", name: "Slate" },
        { hex: "#78716c", name: "Stone" },
        { hex: "#6b7280", name: "Gray" },
        { hex: "#374151", name: "Charcoal" },
    ];

    let customHex = selectedColor;
    let showCustomInput = false;

    function selectColor(hex) {
        selectedColor = hex;
        customHex = hex;
        dispatch("select", { color: hex });
        isOpen = false;
    }

    function applyCustomColor() {
        // Validar hex
        if (/^#[0-9A-Fa-f]{6}$/.test(customHex)) {
            selectColor(customHex);
        }
    }

    function handleKeydown(e) {
        if (e.key === "Escape") {
            isOpen = false;
        } else if (e.key === "Enter" && showCustomInput) {
            applyCustomColor();
        }
    }
</script>

{#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="picker-overlay"
        on:click={() => (isOpen = false)}
        on:keydown={handleKeydown}
    >
        <div class="picker-container" on:click|stopPropagation>
            <!-- Header -->
            <div class="picker-header">
                <span class="picker-title">Escolher Cor</span>
                <button class="close-btn" on:click={() => (isOpen = false)}
                    >×</button
                >
            </div>

            <!-- Preview -->
            <div class="preview-section">
                <div
                    class="preview-color"
                    style="background: {selectedColor}"
                ></div>
                <div class="preview-info">
                    <span class="preview-hex"
                        >{selectedColor.toUpperCase()}</span
                    >
                    <span class="preview-name">
                        {colorPalette.find((c) => c.hex === selectedColor)
                            ?.name || "Custom"}
                    </span>
                </div>
            </div>

            <!-- Color Grid -->
            <div class="color-grid-wrapper">
                <div class="color-grid">
                    {#each colorPalette as color}
                        <button
                            class="color-btn"
                            class:selected={selectedColor === color.hex}
                            style="background: {color.hex}"
                            on:click={() => selectColor(color.hex)}
                            title={color.name}
                        >
                            {#if selectedColor === color.hex}
                                <span class="check">✓</span>
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Custom Color Toggle -->
            <div class="custom-section">
                <button
                    class="custom-toggle"
                    on:click={() => (showCustomInput = !showCustomInput)}
                >
                    {showCustomInput ? "▼" : "▶"} Cor personalizada
                </button>

                {#if showCustomInput}
                    <div class="custom-input-row">
                        <div
                            class="custom-preview"
                            style="background: {/^#[0-9A-Fa-f]{6}$/.test(
                                customHex,
                            )
                                ? customHex
                                : '#333'}"
                        ></div>
                        <input
                            type="text"
                            bind:value={customHex}
                            placeholder="#7c3aed"
                            class="hex-input"
                            maxlength="7"
                        />
                        <button class="apply-btn" on:click={applyCustomColor}>
                            Aplicar
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .picker-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .picker-container {
        background: linear-gradient(
            135deg,
            rgba(26, 26, 36, 0.95),
            rgba(18, 18, 28, 0.98)
        );
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        width: 320px;
        overflow: hidden;
        box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(139, 92, 246, 0.1);
        animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .picker-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .picker-title {
        font-size: 14px;
        font-weight: 600;
        color: #fff;
    }

    .close-btn {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        background: transparent;
        color: rgba(255, 255, 255, 0.5);
        font-size: 18px;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
    }

    .close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }

    .preview-section {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .preview-color {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        box-shadow:
            0 4px 12px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .preview-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .preview-hex {
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        font-family: monospace;
    }

    .preview-name {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
    }

    .color-grid-wrapper {
        padding: 16px;
    }

    .color-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 8px;
    }

    .color-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .color-btn:hover {
        transform: scale(1.15);
        z-index: 1;
    }

    .color-btn.selected {
        border-color: #fff;
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
    }

    .check {
        color: #fff;
        font-size: 14px;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    .custom-section {
        padding: 12px 16px 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .custom-toggle {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        font-size: 12px;
        cursor: pointer;
        padding: 4px 0;
        transition: color 0.2s;
    }

    .custom-toggle:hover {
        color: #fff;
    }

    .custom-input-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        animation: fadeIn 0.2s ease-out;
    }

    .custom-preview {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .hex-input {
        flex: 1;
        padding: 8px 12px;
        font-size: 13px;
        font-family: monospace;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.3);
        color: #fff;
        outline: none;
        transition: all 0.2s;
    }

    .hex-input:focus {
        border-color: rgba(139, 92, 246, 0.5);
    }

    .apply-btn {
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 600;
        border-radius: 8px;
        background: rgba(139, 92, 246, 0.3);
        border: 1px solid rgba(139, 92, 246, 0.4);
        color: #c4b5fd;
        cursor: pointer;
        transition: all 0.2s;
    }

    .apply-btn:hover {
        background: rgba(139, 92, 246, 0.5);
        color: #fff;
    }
</style>
