<script>
  import { getPlatform } from "$lib/platforms.js";
  
  export let platform = 'chatgpt';
  export let size = 16;
  export let showLabel = false;
  export let showTooltip = true;
  
  $: p = getPlatform(platform);
  $: sizeStr = `${size}px`;
  $: fontSize = `${Math.max(8, size - 4)}px`;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<span
  class="platform-badge"
  style="
    --badge-size: {sizeStr};
    --badge-color: {p.color};
    --badge-bg: {p.bgSubtle};
    --badge-border: {p.borderColor};
    --badge-font: {fontSize};
  "
  title={showTooltip ? `${p.name} (${p.company})` : ''}
>
  <span class="badge-icon" style="width: {sizeStr}; height: {sizeStr};">
    {@html p.svg}
  </span>
  {#if showLabel}
    <span class="badge-label">{p.name}</span>
  {/if}
</span>

<style>
  .platform-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 999px;
    background: var(--badge-bg);
    border: 1px solid var(--badge-border);
    transition: all 0.2s ease;
    cursor: default;
    flex-shrink: 0;
  }

  .platform-badge:hover {
    filter: brightness(1.2);
    transform: scale(1.05);
  }

  .badge-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .badge-icon :global(svg) {
    width: 100%;
    height: 100%;
    color: var(--badge-color);
  }

  .badge-label {
    font-size: var(--badge-font);
    font-weight: 600;
    color: var(--badge-color);
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
</style>
