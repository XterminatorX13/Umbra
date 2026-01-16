<script>
    export let text = "";
    export let as = "h1";
    export let className = "";
</script>

<svelte:element this={as} class="text-gradient {className}">
    {text}
    <slot />
</svelte:element>

<style>
    .text-gradient {
        background: linear-gradient(
            to bottom,
            var(--color-text-primary) 0%,
            var(--highlight) 50%,
            var(--color-text-tertiary) 100%
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: 700;
    }
</style>
