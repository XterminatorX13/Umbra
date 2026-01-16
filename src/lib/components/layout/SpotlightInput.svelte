<script>
    import { createEventDispatcher } from "svelte";

    export let value = "";
    export let placeholder = "";
    export let className = "";

    const dispatch = createEventDispatcher();
    let inputElement;
    let internalValue = value;

    // Update internal value when typing
    function handleInput(e) {
        internalValue = e.target.value;
    }

    // On blur, dispatch the current internal value
    function handleBlur(e) {
        // Dispatch blur with the actual typed value
        dispatch("blur", { currentValue: internalValue });
    }

    function handleKeydown(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            dispatch("submit", { currentValue: internalValue });
        }
    }

    // Sync parent value to internal ONLY when value changes from parent AND not focused
    $: if (
        value !== internalValue &&
        inputElement &&
        !inputElement.matches(":focus")
    ) {
        internalValue = value;
    }
</script>

<input
    bind:this={inputElement}
    type="text"
    value={internalValue}
    on:input={handleInput}
    on:blur={handleBlur}
    on:keydown={handleKeydown}
    {placeholder}
    class="spotlight-input {className}"
/>

<style>
    .spotlight-input {
        position: relative;
        width: 100%;
        background: var(--bg-panel, #121212);
        color: var(--color-text-primary, #e4e4e7);
        border: 1px solid rgba(139, 92, 246, 0.2);
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 13px;
        outline: none;
        transition: all 0.2s;
    }

    .spotlight-input::placeholder {
        color: var(--color-text-tertiary, #52525b);
    }

    .spotlight-input:focus {
        background: var(--layer-1, #1e1e1e);
        border-color: var(--highlight, #8b5cf6);
        box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }
</style>
