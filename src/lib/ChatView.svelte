<script>
  import { createEventDispatcher, onMount, onDestroy, tick } from "svelte";
  import { getConvKey } from "./utils";
  import { parseMarkdown } from "./utils/markdown.js";
  import "./styles/markdown.css";
  import {
    Folder,
    Tags,
    BarChart2,
    FileText,
    Save,
    X,
    Menu,
    Star,
    Copy,
    Download,
    Type,
    ChevronRight,
    ChevronDown,
    MessageSquare,
    User,
    Bot,
  } from "lucide-svelte";
  import BorderBeam from "./components/BorderBeam.svelte";

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
    const activeElement = document.activeElement;
    const isInput =
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.contentEditable === "true";

    // Escape = closes sidebar if open, else deselect
    if (e.key === "Escape") {
      if (showSidebar) {
        showSidebar = false;
        e.preventDefault();
        return;
      } else if (conversation) {
        e.preventDefault();
        deselect();
      }
    }

    // Don't trigger other shortcuts if typing
    if (isInput && e.key !== "s") return; // Allow Ctrl+S in inputs

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
    if (e.key === "b" && conversation && !e.ctrlKey && !e.metaKey && !isInput) {
      e.preventDefault();
      showSidebar = !showSidebar;
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
    <div class="floating-icon">
      <MessageSquare size={48} color="var(--highlight)" />
    </div>

    <!-- Main content -->
    <div
      style="text-align: center; z-index: 1; animation: fadeInUp 0.6s ease-out;"
    >
      <h2
        style="font-size: 24px; font-weight: 700; color: var(--highlight); margin-bottom: 12px; text-shadow: 0 0 30px rgba(157, 78, 221, 0.2);"
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
        <div class="hint-icon"><Star size={18} /></div>
        <div class="hint-text">Favoritos</div>
        <div class="hint-label">Acesso rápido</div>
      </div>
      <div class="hint-card">
        <div class="hint-icon"><Folder size={18} /></div>
        <div class="hint-text">Pastas</div>
        <div class="hint-label">Organizar</div>
      </div>
      <div class="hint-card">
        <div class="hint-icon"><BarChart2 size={18} /></div>
        <div class="hint-text">Command</div>
        <div class="hint-label">Em breve</div>
      </div>
    </div>
  </div>
{:else}
  <div
    style="position: relative; background: var(--bg-deep); border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; height: 100%; width: 100%;"
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
          <span style="display:flex; align-items:center; gap:4px;"
            ><MessageSquare size={10} />
            {conversation.messages.length} mensagens</span
          >
          <span>·</span>
          <span>📅 {epochToString(conversation.createTime)}</span>
        </div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <!-- Font size controls -->
        <button
          on:click={() => changeFontSize(-1)}
          title="Diminuir fonte (Ctrl+-)"
          class="icon-btn"><Type size={14} />-</button
        >
        <button
          on:click={() => changeFontSize(1)}
          title="Aumentar fonte (Ctrl++)"
          class="icon-btn"><Type size={14} />+</button
        >

        <div style="width: 1px; height: 20px; background: var(--border);"></div>

        <!-- Copy -->
        <button
          on:click={copyConversation}
          title="Copiar conversa (Ctrl+Shift+C)"
          class="icon-btn"
          style:color={copySuccess ? "var(--highlight)" : ""}
        >
          {#if copySuccess}✓{:else}<Copy size={16} />{/if}
        </button>

        <!-- Export -->
        <button
          on:click={exportConversation}
          title="Exportar JSON"
          class="icon-btn"
        >
          <Download size={16} />
        </button>

        <!-- Favorite -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          on:click={toggleFav}
          title="Favoritar"
          class="fav-btn"
          class:is-fav={meta.favorite}
        >
          <Star
            size={20}
            fill={meta.favorite ? "var(--highlight)" : "none"}
            color={meta.favorite
              ? "var(--highlight)"
              : "var(--color-text-secondary)"}
          />
        </div>

        <div style="width: 1px; height: 20px; background: var(--border);"></div>

        <!-- Sidebar Toggle -->
        <button
          on:click={() => (showSidebar = !showSidebar)}
          title="Propriedades (B)"
          class="toggle-btn"
          class:active={showSidebar}
        >
          <Menu size={18} />
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div
      bind:this={chatContainer}
      style="flex: 1; overflow-y: auto; padding: 24px; background: radial-gradient(circle at top left, var(--bg-deep), var(--bg-main) 60%); font-size: {fontSize}px;"
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

      {#each renderedMessages as msg (msg.id)}
        <div class="message-bubble {msg.role}">
          <div class="msg-avatar">
            {#if msg.role === "user"}
              <User size={16} />
            {:else}
              <Bot size={16} />
            {/if}
          </div>
          <div class="msg-content markdown-content">
            {@html getCachedMarkdown(msg)}
          </div>
        </div>
      {/each}

      <div style="height: 50px;"></div>
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
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="properties-sidebar" on:click|stopPropagation>
      <div class="sidebar-header">
        <span style="display:flex; align-items:center; gap:8px;"
          ><FileText size={16} /> Propriedades</span
        >
        <button on:click={() => (showSidebar = false)} class="sidebar-close"
          ><X size={16} /></button
        >
      </div>

      <!-- Folder -->
      <div class="sidebar-section">
        <label class="sidebar-label"
          ><Folder size={12} style="display:inline; margin-right:4px;" /> Pasta</label
        >
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
        <label class="sidebar-label"
          ><Tags size={12} style="display:inline; margin-right:4px;" /> Tags</label
        >
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
        <label class="sidebar-label"
          ><BarChart2 size={12} style="display:inline; margin-right:4px;" /> Estatísticas</label
        >
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{conversation.messages.length}</span>
            <span class="stat-label">total</span>
          </div>
          <div class="stat-item">
            <span class="stat-value"
              >{conversation.messages.filter((m) => m.role === "user")
                .length}</span
            >
            <span class="stat-label">você</span>
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
        <label class="sidebar-label"
          ><FileText size={12} style="display:inline; margin-right:4px;" /> Notas
          Privadas</label
        >
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
          <Save size={14} style="display:inline; margin-right:6px;" /> Salvar
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

  .message-bubble {
    /* Performance: isolate layout and paint */
    contain: content;
    content-visibility: auto;
    contain-intrinsic-size: 0 100px;
    margin-bottom: 24px;
    display: flex;
    gap: 16px;
    animation: messageIn 0.4s ease-out backwards;
  }

  .message-bubble.user {
    flex-direction: row-reverse;
  }

  .message-bubble.user .msg-content {
    background: var(--layer-2);
    border: 1px solid var(--border-light);
    border-top-right-radius: 4px;
  }

  .message-bubble.assistant .msg-content {
    background: transparent;
    border: 1px solid transparent;
    padding-left: 0;
  }

  .msg-avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--layer-2);
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  .message-bubble.user .msg-avatar {
    background: var(--highlight);
    color: #fff;
  }

  .msg-content {
    max-width: 85%;
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 1em; /* Inherits from container font-size */
    line-height: 1.6;
    color: var(--color-text-primary);
    overflow-wrap: break-word;
  }

  .msg-content :global(p) {
    margin: 0 0 1em 0;
  }
  .msg-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .msg-content :global(pre) {
    background: #1e1e1e;
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
    border: 1px solid var(--border);
    margin: 1em 0;
  }

  .msg-content :global(code) {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 4px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  /* Empty state styles */
  .empty-state-glow {
    position: absolute;
    width: 400px;
    height: 400px;
    background: radial-gradient(
      circle,
      rgba(157, 78, 221, 0.1) 0%,
      transparent 70%
    );
    border-radius: 50%;
    animation: pulse-glow 6s ease-in-out infinite;
    pointer-events: none;
  }

  .floating-icon {
    animation: float 4s ease-in-out infinite;
    filter: drop-shadow(0 0 20px rgba(157, 78, 221, 0.3));
    margin-bottom: 24px;
  }

  .hint-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 24px;
    background: var(--layer-1);
    border: 1px solid var(--border-light);
    border-radius: var(--radius);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    min-width: 100px;
  }

  .hint-card:hover {
    transform: translateY(-5px);
    border-color: var(--highlight);
    box-shadow: 0 10px 30px -10px rgba(157, 78, 221, 0.3);
  }

  .hint-icon {
    color: var(--highlight);
  }
  .hint-text {
    font-weight: 600;
    font-size: 13px;
    color: var(--color-text-primary);
  }
  .hint-label {
    font-size: 11px;
    color: var(--color-text-secondary);
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes pulse-glow {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.3;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.5;
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Header Controls */
  .icon-btn {
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .icon-btn:hover {
    background: var(--layer-2);
    color: var(--color-text-primary);
  }

  .fav-btn {
    cursor: pointer;
    padding: 4px;
    transition: transform 0.2s;
  }
  .fav-btn:hover {
    transform: scale(1.1);
  }
  .fav-btn.is-fav {
    animation: pulse 0.3s;
  }

  .toggle-btn {
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .toggle-btn:hover,
  .toggle-btn.active {
    background: var(--layer-2);
    color: var(--highlight);
  }

  /* Properties Sidebar */
  .properties-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 320px;
    height: 100vh;
    background: rgba(11, 10, 18, 0.95); /* Matches bg-main with opacity */
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    z-index: 1000;
    animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1); /* Apple easing */
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
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
    padding: 20px;
    border-bottom: 1px solid var(--border);
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: 14px;
    letter-spacing: -0.01em;
  }

  .sidebar-close {
    background: transparent;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .sidebar-close:hover {
    background: var(--layer-2);
    color: var(--color-text-primary);
  }

  .sidebar-section {
    padding: 20px;
    border-bottom: 1px solid var(--border-light);
  }

  .sidebar-label {
    display: flex;
    align-items: center;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-tertiary);
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .sidebar-input,
  .sidebar-notes {
    width: 100%;
    background: var(--layer-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 13px;
    color: var(--color-text-primary);
    transition: all 0.2s ease;
    font-family: var(--font-primary);
  }

  .sidebar-input:focus,
  .sidebar-notes:focus {
    outline: none;
    border-color: var(--highlight);
    background: var(--layer-2);
    box-shadow: 0 0 0 3px rgba(157, 78, 221, 0.15);
  }

  .sidebar-notes {
    min-height: 150px;
    resize: none;
    line-height: 1.6;
  }

  .tag-badge {
    display: inline-flex;
    padding: 4px 10px;
    font-size: 11px;
    background: var(--layer-2);
    border: 1px solid var(--border-light);
    color: var(--color-text-secondary);
    border-radius: 12px;
    font-weight: 500;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .stat-item {
    background: var(--layer-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 8px;
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 18px;
    font-weight: 700;
    color: var(--highlight);
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 10px;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
  }

  .sidebar-save-btn {
    width: 100%;
    padding: 12px;
    background: var(--gradient-primary);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .sidebar-save-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px -6px rgba(157, 78, 221, 0.5);
  }
</style>
