<script>
  import { createEventDispatcher, onMount, onDestroy, tick } from "svelte";
  import { getConvKey } from "./utils";
  import { parseMarkdown } from "./utils/markdown.js";
  import "./styles/markdown.css";

  export let conversation = null;
  export let meta = {};

  const dispatch = createEventDispatcher();

  let notes = meta.notes ?? "";
  let folder = meta.folder ?? "";
  let tags = (meta.tags ?? []).join(", ");
  let showNotesPreview = false;
  let copySuccess = false;
  let fontSize = localStorage.getItem("chat-font-size") || "13";

  // Lazy loading state
  const MESSAGES_PER_PAGE = 20;
  let visibleCount = MESSAGES_PER_PAGE;
  let renderedMessages = [];
  let isRendering = false;
  let showSidebar = false;
  let chatContainer;

  // Markdown cache to prevent re-parsing
  const markdownCache = new Map();

  function getCachedMarkdown(msg) {
    const key = msg.id || `${msg.role}-${msg.textPlain?.slice(0, 100)}`;
    if (!markdownCache.has(key)) {
      markdownCache.set(key, parseMarkdown(msg.textMarkdown || msg.textPlain));
    }
    return markdownCache.get(key);
  }

  // Clear cache when conversation changes
  $: if (conversation) {
    markdownCache.clear();
    visibleCount = MESSAGES_PER_PAGE;
    renderMessagesAsync();
  }

  // Async rendering with RAF - batched for better performance
  async function renderMessagesAsync() {
    if (!conversation?.messages) {
      renderedMessages = [];
      return;
    }

    isRendering = true;
    const toRender = conversation.messages.slice(-visibleCount);

    // Render in batches of 5 for smoother UI
    const BATCH_SIZE = 5;
    renderedMessages = [];

    for (let i = 0; i < toRender.length; i += BATCH_SIZE) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const batch = toRender.slice(i, i + BATCH_SIZE);
      renderedMessages = [...renderedMessages, ...batch];
    }

    isRendering = false;
  }

  function loadMoreMessages() {
    visibleCount = Math.min(
      visibleCount + MESSAGES_PER_PAGE,
      conversation.messages.length,
    );
    renderMessagesAsync();
  }

  $: hasMoreMessages =
    conversation?.messages && visibleCount < conversation.messages.length;
  $: remainingCount = conversation?.messages
    ? conversation.messages.length - visibleCount
    : 0;

  $: {
    notes = meta.notes ?? "";
    folder = meta.folder ?? "";
    tags = (meta.tags ?? []).join(", ");
  }

  function toggleFav() {
    if (!conversation) return;
    dispatch("toggleFav", { id: getConvKey(conversation) });
  }

  function saveMeta() {
    if (!conversation) return;
    const tagArr = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    dispatch("updateMeta", {
      id: getConvKey(conversation),
      folder: folder.trim(),
      tags: tagArr,
      notes,
    });
  }

  function copyConversation() {
    if (!conversation) return;
    const text = conversation.messages
      .map((m) => `[${m.role.toUpperCase()}]\n${m.textPlain}\n`)
      .join("\n---\n\n");

    navigator.clipboard.writeText(text).then(() => {
      copySuccess = true;
      setTimeout(() => (copySuccess = false), 2000);
    });
  }

  function exportConversation() {
    if (!conversation) return;
    const blob = new Blob([JSON.stringify(conversation.raw, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${conversation.title || "conversation"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function changeFontSize(delta) {
    fontSize = Math.max(8, Math.min(24, parseInt(fontSize) + delta)).toString();
    localStorage.setItem("chat-font-size", fontSize);
  }

  function epochToString(epoch) {
    if (!epoch) return "";
    const ms = epoch < 2000000000 ? epoch * 1000 : epoch;
    return new Date(ms).toLocaleString();
  }

  // Hotkeys
  function handleKeydown(e) {
    // Escape = Deselect conversation (go to home)
    if (e.key === "Escape" && conversation) {
      e.preventDefault();
      deselect();
    }
    // Ctrl/Cmd + S = Save metadata
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveMeta();
    }
    // Ctrl/Cmd + + = Increase font size
    if ((e.ctrlKey || e.metaKey) && e.key === "=") {
      e.preventDefault();
      changeFontSize(1);
    }
    // Ctrl/Cmd + - = Decrease font size
    if ((e.ctrlKey || e.metaKey) && e.key === "-") {
      e.preventDefault();
      changeFontSize(-1);
    }
    // Ctrl/Cmd + Shift + C = Copy conversation
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
      e.preventDefault();
      copyConversation();
    }
    // B = Toggle sidebar
    if (e.key === "b" && conversation && !e.ctrlKey && !e.metaKey) {
      const activeElement = document.activeElement;
      if (
        activeElement.tagName !== "INPUT" &&
        activeElement.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        showSidebar = !showSidebar;
      }
    }
  }

  function deselect() {
    dispatch("deselect");
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeydown);
  });
</script>

{#if !conversation}
  <div
    style="position: relative; background: var(--bg-deep); border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; align-items: center; justify-content: center; color: var(--color-text-secondary); flex: 1;"
  >
    <!-- Background glow effect -->
    <div class="empty-state-glow"></div>

    <!-- Floating icon with animation -->
    <div class="floating-icon">✨</div>

    <!-- Main content -->
    <div
      style="text-align: center; z-index: 1; animation: fadeInUp 0.6s ease-out;"
    >
      <h2
        style="font-size: 24px; font-weight: 700; color: var(--highlight); margin-bottom: 12px; text-shadow: 0 0 30px rgba(217, 111, 255, 0.4);"
      >
        PKM ChatGPT
      </h2>
      <p
        style="font-size: 15px; color: var(--color-text-primary); margin-bottom: 8px;"
      >
        Selecione uma conversa para começar
      </p>
      <p
        style="font-size: 12px; opacity: 0.6; max-width: 280px; line-height: 1.5;"
      >
        Use ↑↓ para navegar, ou clique em uma conversa na sidebar
      </p>
    </div>

    <!-- Keyboard hints -->
    <div
      style="margin-top: 40px; display: flex; gap: 16px; z-index: 1; animation: fadeInUp 0.8s ease-out;"
    >
      <div class="hint-card">
        <div class="hint-icon">🔍</div>
        <div class="hint-text">Ctrl+K</div>
        <div class="hint-label">Buscar</div>
      </div>
      <div class="hint-card">
        <div class="hint-icon">⭐</div>
        <div class="hint-text">Favoritos</div>
        <div class="hint-label">Acesso rápido</div>
      </div>
      <div class="hint-card">
        <div class="hint-icon">📁</div>
        <div class="hint-text">Pastas</div>
        <div class="hint-label">Organizar</div>
      </div>
    </div>
  </div>
{:else}
  <div
    style="position: relative; background: var(--bg-deep); border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden;"
  >
    <!-- Header -->
    <div
      style="padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--bg-panel); display: flex; justify-content: space-between; align-items: center;"
    >
      <div style="flex: 1; min-width: 0;">
        <div
          style="font-size: 16px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 4px;"
        >
          {conversation.title || "(Sem título)"}
        </div>
        <div
          style="font-size: 11px; color: var(--color-text-secondary); display: flex; gap: 8px;"
        >
          <span>💬 {conversation.messages.length} mensagens</span>
          <span>·</span>
          <span>📅 {epochToString(conversation.createTime)}</span>
        </div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <!-- Font size controls -->
        <button
          on:click={() => changeFontSize(-1)}
          title="Diminuir fonte (Ctrl+-)"
          style="padding: 4px 8px; font-size: 12px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: var(--color-text-secondary); cursor: pointer;"
          >A-</button
        >
        <button
          on:click={() => changeFontSize(1)}
          title="Aumentar fonte (Ctrl++)"
          style="padding: 4px 8px; font-size: 12px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: var(--color-text-secondary); cursor: pointer;"
          >A+</button
        >

        <div style="width: 1px; height: 20px; background: var(--border);"></div>

        <!-- Copy -->
        <button
          on:click={copyConversation}
          title="Copiar conversa (Ctrl+Shift+C)"
          style="padding: 6px 10px; font-size: 16px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: {copySuccess
            ? 'var(--accent-1)'
            : 'var(--layer-2)'}; color: {copySuccess
            ? '#fff'
            : 'var(--color-text-secondary)'}; cursor: pointer; transition: all 0.2s;"
        >
          {copySuccess ? "✓" : "📋"}
        </button>

        <!-- Export -->
        <button
          on:click={exportConversation}
          title="Exportar JSON"
          style="padding: 6px 10px; font-size: 16px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-2); color: var(--color-text-secondary); cursor: pointer;"
        >
          💾
        </button>

        <!-- Favorite -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          on:click={toggleFav}
          title="Favoritar"
          style="font-size: 20px; cursor: pointer; color: {meta.favorite
            ? 'var(--highlight)'
            : 'var(--color-text-secondary)'}; transition: all 0.2s; filter: {meta.favorite
            ? 'drop-shadow(0 0 8px var(--highlight))'
            : 'none'};"
        >
          {meta.favorite ? "★" : "☆"}
        </div>

        <div style="width: 1px; height: 20px; background: var(--border);"></div>

        <!-- Sidebar Toggle -->
        <button
          on:click={() => (showSidebar = !showSidebar)}
          title="Propriedades (B)"
          style="padding: 6px 10px; font-size: 14px; border-radius: var(--radius-small); border: 1px solid {showSidebar
            ? 'var(--highlight)'
            : 'var(--border-light)'}; background: {showSidebar
            ? 'var(--accent-1)'
            : 'var(--layer-2)'}; color: {showSidebar
            ? '#fff'
            : 'var(--color-text-secondary)'}; cursor: pointer; transition: all 0.2s;"
        >
          ☰
        </button>
      </div>
    </div>

    <!-- Metadata Panel (collapsible) -->
    <div
      style="border-bottom: 1px solid var(--border); background: var(--bg-panel);"
    >
      <div
        style="padding: 10px 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;"
      >
        <div>
          <label
            for="folder-input"
            style="font-size: 11px; color: var(--color-text-secondary); display: block; margin-bottom: 4px;"
            >📁 Pasta</label
          >
          <input
            id="folder-input"
            type="text"
            bind:value={folder}
            placeholder="Ex.: Trabalho"
            style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-1); color: var(--color-text-primary);"
          />
        </div>
        <div>
          <label
            for="tags-input"
            style="font-size: 11px; color: var(--color-text-secondary); display: block; margin-bottom: 4px;"
            >🏷️ Tags (vírgula)</label
          >
          <input
            id="tags-input"
            type="text"
            bind:value={tags}
            placeholder="Ex.: importante, ideia"
            style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: var(--radius-small); border: 1px solid var(--border-light); background: var(--layer-1); color: var(--color-text-primary);"
          />
        </div>
        <div
          style="grid-column: 1 / -1; display: flex; justify-content: flex-end;"
        >
          <button
            on:click={saveMeta}
            title="Salvar metadados (Ctrl+S)"
            style="padding: 6px 16px; font-size: 12px; border-radius: var(--radius-small); border: none; background: var(--accent-1); color: #fff; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 12px rgba(217, 111, 255, 0.3);"
          >
            💾 Salvar Metadados
          </button>
        </div>
      </div>
    </div>

    <!-- Messages -->
    <div
      bind:this={chatContainer}
      style="flex: 1; overflow-y: auto; padding: 24px; background: radial-gradient(circle at top left, var(--bg-deep), var(--bg-main) 60%);"
    >
      <!-- Load More Button -->
      {#if hasMoreMessages}
        <div style="text-align: center; margin-bottom: 20px;">
          <button
            on:click={loadMoreMessages}
            style="padding: 10px 24px; font-size: 12px; border-radius: 999px; border: 1px solid var(--border-light); background: var(--layer-2); color: var(--color-text-primary); cursor: pointer; transition: all 0.3s;"
            class="load-more-btn"
          >
            ⬆️ Carregar Mais ({remainingCount} mensagens anteriores)
          </button>
        </div>
      {/if}

      <!-- Loading indicator -->
      {#if isRendering}
        <div
          style="text-align: center; padding: 20px; color: var(--color-text-secondary);"
        >
          <div class="loading-spinner"></div>
          <div style="margin-top: 8px; font-size: 12px;">
            Carregando mensagens...
          </div>
        </div>
      {/if}

      {#each renderedMessages as msg, idx}
        <div
          class="message-bubble"
          style="max-width: 80%; margin-bottom: 16px; padding: 14px 16px; border-radius: var(--radius); font-size: {fontSize}px; line-height: 1.6; white-space: pre-wrap; animation: messageIn 0.3s {idx *
            0.03}s backwards; {msg.role === 'user'
            ? 'margin-left: auto; background: linear-gradient(135deg, var(--layer-2), var(--layer-3)); border: 1px solid var(--border-light); box-shadow: 0 2px 10px rgba(0,0,0,0.3);'
            : msg.role === 'assistant'
              ? 'margin-right: auto; background: linear-gradient(135deg, var(--layer-1), var(--layer-2)); border: 1px solid var(--border-light); box-shadow: 0 2px 10px rgba(0,0,0,0.3);'
              : 'margin: 0 auto; background: transparent; color: var(--color-text-secondary); font-size: 11px; text-align: center;'}"
        >
          <div
            style="font-size: 10px; margin-bottom: 8px; color: var(--color-text-secondary); opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between; align-items: center;"
          >
            <span
              >{msg.role === "assistant"
                ? "🤖 ChatGPT"
                : msg.role === "user"
                  ? "👤 Você"
                  : msg.role}</span
            >
            {#if msg.timestamp}
              <span style="font-size: 9px;">{epochToString(msg.timestamp)}</span
              >
            {/if}
          </div>
          <div class="msg-content markdown-content">
            {@html getCachedMarkdown(msg)}
          </div>
        </div>
      {/each}
    </div>

    <!-- Notes Panel -->
    <div
      style="border-top: 1px solid var(--border); background: var(--bg-panel); "
    >
      <div
        style="padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;"
        on:click={() => (showNotesPreview = !showNotesPreview)}
      >
        <div
          style="font-size: 13px; font-weight: 600; color: var(--highlight);"
        >
          📝 Notas Privadas {notes.trim() ? `(${notes.length} caracteres)` : ""}
        </div>
        <div style="font-size: 12px; color: var(--color-text-secondary);">
          {showNotesPreview ? "▼" : "▶"}
          {showNotesPreview ? "Ocultar" : "Expandir"}
        </div>
      </div>

      {#if showNotesPreview && notes.trim()}
        <div
          style="padding: 12px 20px; border-top: 1px solid var(--border); background: var(--layer-1); font-size: 12px; color: var(--color-text-primary); line-height: 1.6; max-height: 200px; overflow-y: auto; animation: slideDown 0.2s;"
        >
          <div class="msg-content markdown-content">
            {@html parseMarkdown(notes)}
          </div>
        </div>
      {/if}

      <div style="padding: 12px 20px;">
        <textarea
          bind:value={notes}
          on:blur={saveMeta}
          placeholder="Adicione suas reflexões, insights, resumos..."
          style="width: 100%; padding: 12px; font-size: 13px; border-radius: var(--radius); background: var(--layer-1); border: 1px solid var(--border-light); color: var(--color-text-primary); min-height: 100px; resize: vertical; transition: all 0.2s;"
          on:focus={(e) => (e.target.style.borderColor = "var(--highlight)")}
          on:blur={(e) => (e.target.style.borderColor = "var(--border-light)")}
        ></textarea>
      </div>
    </div>

    <!-- Hotkeys hint -->
    <div
      style="padding: 8px 20px; border-top: 1px solid var(--border); background: var(--bg-deep); font-size: 10px; color: var(--color-text-secondary); display: flex; gap: 16px; flex-wrap: wrap;"
    >
      <span><kbd>Ctrl+S</kbd> Salvar</span>
      <span><kbd>Ctrl+Shift+C</kbd> Copiar</span>
      <span><kbd>B</kbd> Propriedades</span>
      <span><kbd>Esc</kbd> Voltar</span>
    </div>
  </div>

  <!-- Properties Sidebar (Notion-style) -->
  {#if showSidebar}
    <div class="properties-sidebar">
      <div class="sidebar-header">
        <span>📋 Propriedades</span>
        <button on:click={() => (showSidebar = false)} class="sidebar-close"
          >✕</button
        >
      </div>

      <!-- Folder -->
      <div class="sidebar-section">
        <label class="sidebar-label">📁 Pasta</label>
        <input
          type="text"
          bind:value={folder}
          on:blur={saveMeta}
          placeholder="Ex.: Trabalho"
          class="sidebar-input"
        />
      </div>

      <!-- Tags -->
      <div class="sidebar-section">
        <label class="sidebar-label">🏷️ Tags</label>
        <input
          type="text"
          bind:value={tags}
          on:blur={saveMeta}
          placeholder="importante, ideia"
          class="sidebar-input"
        />
        {#if tags}
          <div
            style="margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;"
          >
            {#each tags
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t) as tag}
              <span class="tag-badge">{tag}</span>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Stats -->
      <div class="sidebar-section">
        <label class="sidebar-label">📊 Estatísticas</label>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{conversation.messages.length}</span>
            <span class="stat-label">mensagens</span>
          </div>
          <div class="stat-item">
            <span class="stat-value"
              >{conversation.messages.filter((m) => m.role === "user")
                .length}</span
            >
            <span class="stat-label">suas</span>
          </div>
          <div class="stat-item">
            <span class="stat-value"
              >{conversation.messages.filter((m) => m.role === "assistant")
                .length}</span
            >
            <span class="stat-label">GPT</span>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div
        class="sidebar-section"
        style="flex: 1; display: flex; flex-direction: column;"
      >
        <label class="sidebar-label">📝 Notas Privadas</label>
        <textarea
          bind:value={notes}
          on:blur={saveMeta}
          placeholder="Suas reflexões, insights..."
          class="sidebar-notes"
        ></textarea>
      </div>

      <!-- Save Button -->
      <div style="padding: 12px;">
        <button on:click={saveMeta} class="sidebar-save-btn">
          💾 Salvar
        </button>
      </div>
    </div>
  {/if}
{/if}

<style>
  @keyframes pulse {
    0%,
    100% {
      opacity: 0.2;
      transform: scale(1);
    }
    50% {
      opacity: 0.4;
      transform: scale(1.05);
    }
  }

  @keyframes messageIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      max-height: 0;
    }
    to {
      opacity: 1;
      max-height: 200px;
    }
  }

  .message-bubble {
    /* Performance: isolate layout and paint */
    contain: content;
    content-visibility: auto;
    contain-intrinsic-size: 0 100px;
  }

  .message-bubble:hover {
    /* Simplified hover - no transform to avoid repaint during scroll */
    box-shadow: 0 4px 20px rgba(217, 111, 255, 0.2) !important;
  }

  .msg-content :global(p) {
    margin: 0 0 8px 0;
  }

  .msg-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .msg-content :global(code) {
    background: var(--bg-main);
    padding: 3px 6px;
    border-radius: 4px;
    border: 1px solid var(--border);
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.9em;
    color: var(--highlight);
  }

  .msg-content :global(a) {
    color: var(--highlight);
    text-decoration: underline;
    text-decoration-style: dotted;
  }

  .msg-content :global(a:hover) {
    text-decoration-style: solid;
  }

  .msg-content :global(strong) {
    color: var(--highlight);
    font-weight: 600;
  }

  button:hover {
    transform: scale(1.05);
  }

  kbd {
    background: var(--layer-2);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 9px;
    border: 1px solid var(--border);
  }

  /* Empty state styles */
  .empty-state-glow {
    position: absolute;
    width: 300px;
    height: 300px;
    background: radial-gradient(
      circle,
      rgba(217, 111, 255, 0.15) 0%,
      transparent 70%
    );
    border-radius: 50%;
    animation: pulse-glow 4s ease-in-out infinite;
  }

  .floating-icon {
    font-size: 80px;
    animation: float 3s ease-in-out infinite;
    filter: drop-shadow(0 0 30px rgba(217, 111, 255, 0.5));
    margin-bottom: 20px;
    z-index: 1;
  }

  .hint-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px 20px;
    background: var(--layer-1);
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    transition: all 0.3s;
  }

  .hint-card:hover {
    transform: translateY(-4px);
    border-color: var(--highlight);
    box-shadow: 0 8px 24px rgba(217, 111, 255, 0.2);
  }

  .hint-icon {
    font-size: 24px;
  }

  .hint-text {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .hint-label {
    font-size: 10px;
    color: var(--color-text-secondary);
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-15px);
    }
  }

  @keyframes pulse-glow {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.8;
    }
  }

  /* Load More Button */
  .load-more-btn:hover {
    background: var(--accent-1) !important;
    color: #fff !important;
    border-color: var(--highlight) !important;
    box-shadow: 0 0 20px rgba(217, 111, 255, 0.4);
    transform: translateY(-2px);
  }

  /* Loading Spinner */
  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid var(--border-light);
    border-top-color: var(--highlight);
    border-radius: 50%;
    margin: 0 auto;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ===== Notion-Style Sidebar ===== */
  .properties-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 300px;
    height: 100vh;
    background: rgba(15, 15, 25, 0.95);
    backdrop-filter: blur(20px);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    z-index: 1000;
    animation: slideInRight 0.3s ease-out;
    box-shadow: -4px 0 30px rgba(0, 0, 0, 0.4);
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border);
    font-weight: 600;
    color: var(--highlight);
  }

  .sidebar-close {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 16px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .sidebar-close:hover {
    background: var(--layer-2);
    color: #fff;
  }

  .sidebar-section {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-light);
  }

  .sidebar-label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .sidebar-input {
    width: 100%;
    padding: 8px 12px;
    font-size: 13px;
    background: var(--layer-1);
    border: 1px solid var(--border-light);
    border-radius: 6px;
    color: var(--color-text-primary);
    transition: all 0.2s;
  }

  .sidebar-input:focus {
    outline: none;
    border-color: var(--highlight);
    box-shadow: 0 0 0 3px rgba(217, 111, 255, 0.15);
  }

  .tag-badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 10px;
    background: linear-gradient(135deg, var(--accent-1), var(--highlight));
    color: #fff;
    border-radius: 12px;
    font-weight: 500;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    text-align: center;
  }

  .stat-item {
    padding: 8px;
    background: var(--layer-1);
    border-radius: 6px;
    border: 1px solid var(--border-light);
  }

  .stat-value {
    display: block;
    font-size: 18px;
    font-weight: 700;
    color: var(--highlight);
  }

  .stat-label {
    font-size: 9px;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .sidebar-notes {
    width: 100%;
    flex: 1;
    min-height: 120px;
    padding: 12px;
    font-size: 13px;
    background: var(--layer-1);
    border: 1px solid var(--border-light);
    border-radius: 6px;
    color: var(--color-text-primary);
    resize: none;
    transition: all 0.2s;
    line-height: 1.6;
  }

  .sidebar-notes:focus {
    outline: none;
    border-color: var(--highlight);
  }

  .sidebar-save-btn {
    width: 100%;
    padding: 10px;
    font-size: 13px;
    font-weight: 600;
    background: linear-gradient(135deg, var(--accent-1), var(--highlight));
    border: none;
    border-radius: 6px;
    color: #fff;
    cursor: pointer;
    transition: all 0.2s;
  }

  .sidebar-save-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(217, 111, 255, 0.4);
  }
</style>
