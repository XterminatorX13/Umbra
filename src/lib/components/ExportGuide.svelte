<script>
  import { PLATFORMS } from '../platforms.js';
  import PlatformBadge from './PlatformBadge.svelte';

  export let show = false;

  let activePlatform = 'chatgpt';

  const guides = {
    chatgpt: {
      steps: [
        { icon: '⚙️', text: 'Abra o ChatGPT → Clique no seu avatar (canto inferior esquerdo)' },
        { icon: '🔐', text: 'Vá em Settings → Data Controls' },
        { icon: '📤', text: 'Clique em "Export Data"' },
        { icon: '📧', text: 'Verifique seu email — você receberá um link de download' },
        { icon: '📦', text: 'Baixe o ZIP e extraia o arquivo conversations.json' },
        { icon: '📥', text: 'Importe o conversations.json no Umbra' },
      ],
      tips: [
        'O link expira em 24h, baixe o mais rápido possível',
        'O arquivo inclui TODAS as conversas da conta',
        'Formato mais completo: preserva branches e edições',
      ],
    },
    claude: {
      steps: [
        { icon: '⚙️', text: 'Abra o Claude (claude.ai) → Clique nas suas iniciais' },
        { icon: '🔐', text: 'Vá em Settings → Privacy' },
        { icon: '📤', text: 'Clique em "Export Data"' },
        { icon: '📧', text: 'Verifique seu email — link de download (expira em 24h)' },
        { icon: '📦', text: 'Baixe o ZIP e extraia o conversations.json' },
        { icon: '📥', text: 'Importe o conversations.json no Umbra' },
      ],
      tips: [
        'Funciona no web app e desktop — NÃO no mobile',
        'Em contas Team/Enterprise, só o Primary Owner pode exportar',
        'As memórias do Claude NÃO são incluídas na exportação',
      ],
    },
    gemini: {
      steps: [
        { icon: '🌐', text: 'Acesse takeout.google.com' },
        { icon: '❌', text: 'Clique em "Deselect all" no topo' },
        { icon: '🔍', text: 'Encontre "My Activity" e marque o checkbox' },
        { icon: '⚙️', text: 'Clique em "All activity data included" → Deselect all → Marque SOMENTE "Gemini Apps"' },
        { icon: '📐', text: 'Opcional: Em "Multiple formats", selecione JSON se disponível' },
        { icon: '📤', text: 'Clique em "Next step" e exporte' },
        { icon: '📧', text: 'Aguarde o email com o link de download' },
        { icon: '📥', text: 'Importe o arquivo .html ou .json no Umbra' },
      ],
      tips: [
        '⚠️ NÃO selecione "Gemini" direto — isso só exporta Gems/configuração',
        'Deve ser "My Activity" → filtrado por "Gemini Apps"',
        'O HTML pode ter 20MB+ — o Umbra processa assincronamente',
        'As mensagens são agrupadas por proximidade temporal (5 min)',
      ],
    },
    grok: {
      steps: [
        { icon: '⚙️', text: 'Acesse grok.com → Clique no seu avatar' },
        { icon: '🔐', text: 'Vá em Settings → Data (ou Data Controls)' },
        { icon: '📤', text: 'Clique em "Export Data" (ou "Download Account Data")' },
        { icon: '📧', text: 'Verifique seu email — link de download' },
        { icon: '📦', text: 'Baixe o arquivo JSON' },
        { icon: '📥', text: 'Importe o arquivo JSON no Umbra' },
      ],
      tips: [
        'Conversas deletadas NÃO são incluídas',
        'Imagens e arquivos compartilhados não são incluídos',
        'O processamento é geralmente rápido (poucos minutos)',
      ],
    },
  };
</script>

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="overlay" on:click|self={() => (show = false)}>
    <div class="guide-dialog">
      <div class="guide-header">
        <h2>📖 Como Exportar suas Conversas</h2>
        <button class="close-btn" on:click={() => (show = false)}>✕</button>
      </div>

      <!-- Platform tabs -->
      <div class="platform-tabs">
        {#each Object.keys(PLATFORMS) as key}
          <button
            class="tab-btn"
            class:active={activePlatform === key}
            style="--tab-color: {PLATFORMS[key].color}; --tab-bg: {PLATFORMS[key].bgSubtle}; --tab-border: {PLATFORMS[key].borderColor};"
            on:click={() => (activePlatform = key)}
          >
            <PlatformBadge platform={key} size={14} />
            <span>{PLATFORMS[key].name}</span>
          </button>
        {/each}
      </div>

      <!-- Active guide -->
      <div class="guide-content">
        <div class="steps-list">
          {#each guides[activePlatform].steps as step, idx}
            <div class="step-item" style="animation-delay: {idx * 0.05}s;">
              <div class="step-number" style="background: {PLATFORMS[activePlatform].bgSubtle}; color: {PLATFORMS[activePlatform].color}; border: 1px solid {PLATFORMS[activePlatform].borderColor};">
                {idx + 1}
              </div>
              <div class="step-icon">{step.icon}</div>
              <div class="step-text">{step.text}</div>
            </div>
          {/each}
        </div>

        {#if guides[activePlatform].tips.length > 0}
          <div class="tips-section">
            <div class="tips-header">💡 Dicas</div>
            {#each guides[activePlatform].tips as tip}
              <div class="tip-item">{tip}</div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  }

  .guide-dialog {
    background: var(--bg-panel, #1a1a2e);
    border: 1px solid var(--border, #333);
    border-radius: 16px;
    width: 640px;
    max-width: 90vw;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
    animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .guide-header {
    padding: 20px 24px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .guide-header h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text-primary, #fff);
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-text-secondary, #888);
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: var(--layer-2, #2a2a3e) !important;
    color: #fff !important;
    transform: none !important;
  }

  .platform-tabs {
    display: flex;
    gap: 6px;
    padding: 0 24px 16px;
    overflow-x: auto;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid var(--border-light, #333);
    background: var(--layer-1, #1e1e30);
    color: var(--color-text-secondary, #888);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .tab-btn.active {
    background: var(--tab-bg) !important;
    border-color: var(--tab-border) !important;
    color: var(--tab-color) !important;
    box-shadow: 0 0 16px var(--tab-bg);
  }

  .tab-btn:hover {
    transform: none !important;
    border-color: var(--tab-border) !important;
  }

  .guide-content {
    padding: 0 24px 24px;
  }

  .steps-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }

  .step-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--layer-1, #1e1e30);
    border: 1px solid var(--border-light, #333);
    animation: stepIn 0.3s ease backwards;
    transition: all 0.2s;
  }

  .step-item:hover {
    border-color: var(--highlight, #d96fff);
    transform: translateX(4px);
  }

  .step-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .step-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  .step-text {
    font-size: 13px;
    color: var(--color-text-primary, #fff);
    line-height: 1.4;
  }

  .tips-section {
    padding: 14px;
    background: rgba(251, 188, 5, 0.06);
    border: 1px solid rgba(251, 188, 5, 0.15);
    border-radius: 10px;
  }

  .tips-header {
    font-size: 13px;
    font-weight: 600;
    color: #FBBC05;
    margin-bottom: 8px;
  }

  .tip-item {
    font-size: 12px;
    color: var(--color-text-secondary, #888);
    padding: 4px 0;
    line-height: 1.4;
  }

  .tip-item::before {
    content: '•';
    margin-right: 6px;
    color: #FBBC05;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  @keyframes stepIn {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
  }
</style>
