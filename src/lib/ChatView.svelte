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
    Zap,
    ArrowUpRight,
    Paperclip,
    Globe,
    Sparkles,
    Circle,
  } from "lucide-svelte";
  import BorderBeam from "./components/BorderBeam.svelte";
  import RichTextEditor from "./components/RichTextEditor.svelte";
  import SpotlightInput from "./components/SpotlightInput.svelte";
  import EmptyState from "./components/EmptyState.svelte";
  import ShineBorder from "./components/ShineBorder.svelte";

  export let conversation = null;
  export let meta = {};

  const dispatch = createEventDispatcher();

  let notes = meta.notes ?? "";
  let folder = meta.folder ?? "";
  let tags = (meta.tags ?? []).join(", ");
  let showNotesPreview = false;
  let copySuccess = false;
  let fontSize = localStorage.getItem("chat-font-size") || "13";
  let inputText = "";

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

  // Track conversation ID to prevent re-renders of same conversation
  let lastConversationId = null;

  // Clear cache when conversation changes (only if it's a new conversation)
  $: {
    const currentId = conversation ? getConvKey(conversation) : null;
    if (currentId && currentId !== lastConversationId) {
      lastConversationId = currentId;
      markdownCache.clear();
      visibleCount = MESSAGES_PER_PAGE;
      // Use setTimeout to break the reactive cycle
      setTimeout(() => renderMessagesAsync(), 0);
    }
  }

  // Async rendering with RAF - batched for better performance
  async function renderMessagesAsync() {
    if (!conversation?.messages) {
      renderedMessages = [];
      isRendering = false;
      return;
    }

    // Guard against concurrent renders
    if (isRendering) return;
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
  <EmptyState />
{:else}
  <div
    style="position: relative; background: var(--bg-deep); border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; height: 100%; width: 100%;"
  >
    <!-- Header with Shine Border -->
    <ShineBorder duration={4} borderWidth={1}>
      <div
        style="padding: 16px 20px; background: var(--bg-panel); display: flex; justify-content: space-between; align-items: center;"
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

          <div
            style="width: 1px; height: 20px; background: var(--border);"
          ></div>

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
          <button
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
          </button>

          <div
            style="width: 1px; height: 20px; background: var(--border);"
          ></div>

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
    </ShineBorder>

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
          <div class="msg-content prose-invert">
            {@html getCachedMarkdown(msg)}
          </div>
        </div>
      {/each}

      <div style="height: 50px;"></div>
    </div>

    <!-- Floating Input Area -->
    <div class="px-8 pb-8 pt-2 flex-shrink-0">
      <div class="max-w-3xl mx-auto relative group">
        <!-- Glow Behind -->
        <div
          class="absolute -inset-1 bg-gradient-to-r from-violet-600/30 via-fuchsia-600/30 to-violet-600/30 rounded-[24px] blur-xl opacity-0 group-focus-within:opacity-100 transition duration-700"
        ></div>

        <div
          class="relative z-10 bg-[#121212]/95 backdrop-blur-2xl border border-white/[0.08] rounded-[20px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)] transition-all overflow-hidden group-focus-within:border-violet-500/40 group-focus-within:ring-1 group-focus-within:ring-violet-500/20"
        >
          <textarea
            bind:value={inputText}
            placeholder="Ask Aurora..."
            class="w-full bg-transparent border-none text-slate-200 px-5 pt-5 pb-2 max-h-[300px] resize-none focus:ring-0 placeholder:text-slate-600 font-normal text-[15px] leading-relaxed custom-scrollbar tracking-wide focus:outline-none"
            rows="1"
            style="min-height: 60px;"
          ></textarea>

          <div class="px-3 pb-3 flex items-center justify-between">
            <div class="flex items-center gap-1">
              <button
                class="p-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-200 transition-colors tooltip"
                title="Attach"><Paperclip size={16} /></button
              >
              <button
                class="p-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-200 transition-colors tooltip"
                title="Web Search"><Globe size={16} /></button
              >
              <button
                class="p-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-violet-400 transition-colors flex items-center gap-2 group/btn"
              >
                <Sparkles size={16} class="group-hover/btn:animate-pulse" />
              </button>
            </div>

            <div class="flex items-center gap-3">
              <button
                class="w-8 h-8 rounded-lg transition-all duration-300 flex items-center justify-center {inputText.trim()
                  ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.5)] hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(124,58,237,0.7)] hover:scale-105'
                  : 'bg-white/5 text-slate-600 cursor-not-allowed'}"
              >
                <ArrowUpRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
        <div
          class="flex justify-between mt-3 px-4 opacity-40 text-[9px] font-semibold text-slate-400 uppercase tracking-[0.2em]"
        >
          <span>Aurora PKM</span>
          <span class="flex items-center gap-1"
            ><Circle size={6} class="fill-green-500 text-green-500" /> Secure</span
          >
        </div>
      </div>
    </div>
  </div>

  <!-- Properties Sidebar (Notion-style) -->
  {#if showSidebar}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div
      class="properties-sidebar"
      role="dialog"
      aria-modal="true"
      aria-label="Propriedades da Conversa"
      on:click|stopPropagation
    >
      <div class="sidebar-header">
        <span
          class="font-semibold text-xs text-slate-400 tracking-wide uppercase"
          >Inspector</span
        >
        <button on:click={() => (showSidebar = false)} class="sidebar-close">
          <X size={14} />
        </button>
      </div>

      <div class="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
        <!-- Summary Card (Private Notes) -->
        <div class="relative group">
          <div
            class="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity"
          ></div>
          <div
            class="relative p-5 rounded-xl bg-[#141414]/80 border border-white/5 shadow-xl backdrop-blur-md"
          >
            <div class="flex items-center gap-2 mb-3">
              <FileText size={14} class="text-violet-400" />
              <h4
                class="text-[11px] font-bold text-slate-300 uppercase tracking-wider"
              >
                Notas Privadas
              </h4>
            </div>
            <div
              class="text-[12px] text-slate-400 leading-relaxed font-normal sidebar-notes-wrapper"
            >
              <RichTextEditor
                content={notes}
                on:change={(e) => {
                  notes = e.detail;
                  saveMeta();
                }}
                placeholder="Adicione suas notas..."
              />
            </div>
          </div>
        </div>

        <!-- Details Grid -->
        <div>
          <h4
            class="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 pl-1"
          >
            Details
          </h4>
          <div class="grid grid-cols-1 gap-2">
            <div
              class="flex items-center justify-between p-3 rounded-[10px] bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
            >
              <div class="flex items-center gap-2 text-slate-500 text-[11px]">
                <MessageSquare size={14} /> Mensagens
              </div>
              <span class="text-[11px] font-mono text-slate-300"
                >{conversation.messages.length}</span
              >
            </div>
            <div
              class="flex items-center justify-between p-3 rounded-[10px] bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
            >
              <div class="flex items-center gap-2 text-slate-500 text-[11px]">
                <Folder size={14} /> Pasta
              </div>
              <SpotlightInput
                bind:value={folder}
                on:blur={saveMeta}
                placeholder="Sem pasta"
                className="bg-transparent border-none text-right w-24 h-6 text-slate-300 p-0"
              />
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div>
          <h4
            class="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 pl-1"
          >
            Tags
          </h4>
          <SpotlightInput
            bind:value={tags}
            on:blur={saveMeta}
            placeholder="Adicionar tags..."
            className="mb-3 w-full bg-[#1a1a1a] border border-white/5 rounded-lg px-3 py-2 text-slate-300 text-xs"
          />
          <div class="flex flex-wrap gap-2">
            {#if tags}
              {#each tags.split(",").filter((t) => t.trim()) as t}
                <span
                  class="px-2.5 py-1.5 rounded-[8px] bg-[#1a1a1a] text-slate-400 text-[11px] font-medium border border-white/5 hover:border-violet-500/30 hover:text-violet-300 transition-all cursor-default"
                >
                  <Tags size={10} class="inline mr-1.5 opacity-40" />{t.trim()}
                </span>
              {/each}
            {/if}
          </div>
        </div>

        <!-- Save Button -->
        <div class="pt-4">
          <button
            on:click={saveMeta}
            class="w-full py-2 bg-white/5 hover:bg-violet-600 text-slate-400 hover:text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border border-white/5 hover:shadow-[0_0_15px_rgba(124,58,237,0.4)]"
          >
            Salvar Alterações
          </button>
        </div>
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
    contain: content;
    content-visibility: auto;
    contain-intrinsic-size: 0 100px;
    margin-bottom: 32px;
    display: flex;
    gap: 20px;
    animation: messageIn 0.4s cubic-bezier(0.2, 0.9, 0.2, 1) backwards;
    padding: 0 16px;
  }

  .message-bubble.user {
    flex-direction: row-reverse;
  }

  .message-bubble.user .msg-content {
    background: #1c1c1c;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-top-right-radius: 4px;
    border-top-left-radius: 16px;
    border-bottom-left-radius: 16px;
    border-bottom-right-radius: 16px;
    color: var(--color-text-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .message-bubble.assistant .msg-content {
    background: linear-gradient(135deg, #181024 0%, #0f0a16 100%);
    border: 1px solid rgba(139, 92, 246, 0.1);
    border-top-left-radius: 4px;
    border-top-right-radius: 16px;
    border-bottom-right-radius: 16px;
    border-bottom-left-radius: 16px;
    padding-left: 24px;
    padding-right: 24px;
    padding-top: 20px;
    padding-bottom: 20px;
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(139, 92, 246, 0.05);
    position: relative;
    overflow: hidden;
  }

  .message-bubble.assistant .msg-content::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(139, 92, 246, 0.2),
      transparent
    );
  }

  .msg-avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 14px;
  }

  .message-bubble.user .msg-avatar {
    background: linear-gradient(135deg, #334155, #1e293b);
    color: #fff;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .message-bubble.assistant .msg-avatar {
    background: linear-gradient(135deg, #2a1b4e, #120820);
    color: #c4b5fd;
    box-shadow: 0 0 15px rgba(124, 58, 237, 0.15);
    position: relative;
    overflow: hidden;
  }

  .msg-content {
    max-width: 80%;
    padding: 16px 24px;
    font-size: 15px;
    line-height: 1.7;
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
    width: 340px;
    height: 100vh;
    background: rgba(11, 10, 18, 0.95);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    z-index: 1000;
    animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow:
      -10px 0 40px rgba(0, 0, 0, 0.5),
      inset 1px 0 0 rgba(255, 255, 255, 0.05);
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
    padding: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: 13px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .sidebar-close {
    background: transparent;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    transition: color 0.2s;
  }

  .sidebar-close:hover {
    color: #fff;
  }

  .sidebar-section {
    padding: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .sidebar-label {
    display: flex;
    align-items: center;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-tertiary);
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .sidebar-input,
  .sidebar-notes {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 13px;
    color: var(--color-text-primary);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: var(--font-primary);
  }

  .sidebar-input:focus,
  .sidebar-notes:focus {
    outline: none;
    border-color: rgba(157, 78, 221, 0.5);
    background: rgba(20, 20, 30, 0.8);
    box-shadow:
      0 0 20px rgba(157, 78, 221, 0.2),
      0 0 40px rgba(157, 78, 221, 0.1);
    transform: translateY(-1px);
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
