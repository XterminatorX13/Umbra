### Exemplos Completos de Implementação para Cada Feature

Entendi, Victor! Como você pediu exemplos **completos** (não só snippets), vou fornecer implementações detalhadas e auto-contidas para cada uma das 10 features que sugeri. Assumi que o seu projeto usa **Svelte** (como vi no GitHub), com Dexie para DB local, Tailwind para CSS, e Web Workers para tarefas pesadas. Cada exemplo inclui:

- Arquivos necessários (ex.: novo componente Svelte, atualizações em existentes como `data.js`).
- Código completo (copie e cole diretamente no seu projeto).
- Instruções de integração (onde colocar, dependências via npm se precisar).
- Testes sugeridos.

Se o seu setup for diferente (ex.: não usar SvelteKit), ajuste levemente. Todas as implementações mantêm o app **100% local/offline**. Instale deps via `bun install` se mencionadas.

#### 1. Mostrar Tool Calls Explicitamente
**Por quê?** Destaca mensagens com content null por tool calls, resolvendo o "none das ferramentas".

**Implementação Completa:**
- Atualize `src/lib/data.js` (adicionando detecção).
- Crie novo componente `src/components/ToolCall.svelte` para renderizar.

Atualização em `data.js` (substitua a função `extractMessagesFromMapping` pela versão completa abaixo):

```javascript
// src/lib/data.js (versão completa com tool calls)
function extractMessagesFromMapping(mapping, fallbackTime, safeUrls = []) {
    const msgs = [];
    for (const key in mapping) {
        const node = mapping[key];
        if (!node || !node.message) continue;

        const msg = node.message;
        const author = msg.author || {};
        const role = author.role || 'unknown';

        if (role === 'tool') continue;
        if (msg.metadata && msg.metadata.is_visually_hidden_from_conversation) continue;

        const contentObj = msg.content || {};
        const ctype = contentObj.content_type;

        if (ctype && String(ctype).startsWith('tether_')) continue;

        let text = '';

        if (ctype === 'text' && Array.isArray(contentObj.parts)) {
            const citations = msg.metadata ? (msg.metadata.citations || []) : [];
            const contentRefs = msg.metadata?.content_references || [];
            text = cleanChatGPTArtifacts(contentObj.parts.join('\n\n'), citations, safeUrls, contentRefs);
        } else if (ctype === 'user_editable_context') {
            continue;
        } else {
            continue;
        }

        if (!text.trim()) continue;

        const ts = msg.create_time != null ? msg.create_time : (fallbackTime || 0);

        // Detect Tools Used (Offline/No-API)
        const tools = detectTools(msg);

        // Detect tool calls explicitly for assistant messages
        let toolCalls = msg.tool_calls || [];
        let hasToolCall = toolCalls.length > 0;
        let contentIsNull = !text.trim() && hasToolCall;
        if (hasToolCall) {
            tools.push({
                type: 'tool_call',
                label: `${toolCalls.length} chamada(s) de ferramenta`,
                icon: 'function',
                details: toolCalls.map(tc => ({
                    id: tc.id || 'unknown',
                    type: tc.type || 'function',
                    name: tc.function?.name || tc.tool?.name || 'desconhecida',
                    arguments: tc.function?.arguments || tc.tool?.arguments || '{}'
                }))
            });
            if (contentIsNull) {
                text = '(Resposta gerada via ferramenta - sem texto direto do assistente)';
            }
        }

        // Extract per-message sources from content_references
        const contentRefs = msg.metadata?.content_references || [];
        const sources = extractSourcesFromRefs(contentRefs);

        // Extract per-message model info
        const msgModelSlug = msg.metadata?.model_slug || null;
        const modelName = msgModelSlug ? (getModelName(msgModelSlug) || msgModelSlug) : null;

        // Detect DALL-E image generation prompts (structured output)
        const imageGenPrompt = parseImageGenPrompt(text);

        msgs.push({
            id: msg.id || key,
            role,
            textMarkdown: imageGenPrompt ? null : text,
            textPlain: imageGenPrompt ? imageGenPrompt.prompt : text,
            timestamp: ts,
            tools,
            sources,
            modelSlug: msgModelSlug,
            modelName: modelName,
            imageGen: imageGenPrompt,
            toolCalls,  // Novo: array completo
            hasToolCall,  // Novo: flag booleano
            contentIsNull  // Novo: flag para null content
        });
    }

    msgs.sort((a, b) => a.timestamp - b.timestamp);
    return msgs;
}

// ... resto do data.js permanece igual
```

Novo componente `ToolCall.svelte`:

```svelte
<!-- src/components/ToolCall.svelte -->
<script>
  export let toolCalls = [];
</script>

{#if toolCalls.length > 0}
  <div class="tool-calls mt-2 p-2 bg-gray-800 rounded-md">
    <h4 class="text-sm font-bold text-white mb-1">Chamadas de Ferramentas:</h4>
    {#each toolCalls as call}
      <details class="mb-1">
        <summary class="text-sm text-blue-300 cursor-pointer">
          {call.name} (ID: {call.id})
        </summary>
        <pre class="text-xs text-gray-300 bg-black p-2 rounded overflow-auto">
          {JSON.stringify(call.arguments, null, 2)}
        </pre>
      </details>
    {/each}
  </div>
{/if}

<style>
  /* Tailwind ou CSS custom */
  .tool-calls { border: 1px solid #4a5568; }
</style>
```

Integração: No componente de mensagem (ex.: `Message.svelte`), adicione `<ToolCall {toolCalls} />` após o texto.

**Dependências:** Nenhuma nova.  
**Teste:** Importe uma conversa com tool calls (ex.: peça no ChatGPT "use code interpreter for 2+2"), verifique se mostra accordion com args.

#### 2. Exportação de Conversa como MD/PDF
**Por quê?** Facilita backup e compartilhamento.

**Implementação Completa:**
- Crie componente `src/components/ExportButton.svelte`.
- Instale deps: `bun add marked html2pdf.js`.

`ExportButton.svelte`:

```svelte
<!-- src/components/ExportButton.svelte -->
<script>
  import { marked } from 'marked';
  import html2pdf from 'html2pdf.js';
  export let messages = [];
  export let title = 'Conversa';

  function exportMD() {
    const mdContent = `# ${title}\n\n` + messages.map(m => `**${m.role.toUpperCase()}**: ${m.textMarkdown || m.textPlain}`).join('\n\n');
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const htmlContent = marked.parse(`# ${title}\n\n` + messages.map(m => `**${m.role.toUpperCase()}**: ${m.textMarkdown || m.textPlain}`).join('\n\n'));
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    html2pdf().from(element).save(`${title}.pdf`);
  }
</script>

<div class="export-buttons flex space-x-2">
  <button on:click={exportMD} class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Exportar MD</button>
  <button on:click={exportPDF} class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Exportar PDF</button>
</div>
```

Integração: Adicione `<ExportButton {messages} {title} />` no componente de visualização de conversa detalhada (ex.: `ConversationDetail.svelte`).

**Dependências:** `marked`, `html2pdf.js`.  
**Teste:** Selecione uma conversa, clique no botão – verifique se baixa arquivo legível.

#### 3. Busca Semântica Local
**Por quê?** Encontra conexões profundas entre conversas.

**Implementação Completa:**
- Instale `bun add @xenova/transformers`.
- Atualize worker de import (ex.: `src/workers/importWorker.js`).
- Crie componente `src/components/SemanticSearch.svelte`.

Atualização em `importWorker.js` (adicionando embeddings):

```javascript
// src/workers/importWorker.js (versão completa com embeddings)
import { pipeline } from '@xenova/transformers';
import db from '../lib/db';  // Seu Dexie setup

let embedder;
async function initEmbedder() {
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
}

self.onmessage = async (event) {
  if (!embedder) await initEmbedder();
  const convs = event.data;  // Array de conversas

  for (const conv of convs) {
    const normalized = normalizeConversation(conv);
    const embedding = await embedder(normalized.searchText, { pooling: 'mean', normalize: true });
    normalized.embedding = Array.from(embedding.data);  // Salva vetor como array
    await db.conversations.put(normalized);
  }

  postMessage({ status: 'done' });
};
```

Novo componente `SemanticSearch.svelte`:

```svelte
<!-- src/components/SemanticSearch.svelte -->
<script>
  import { pipeline } from '@xenova/transformers';
  import db from '../lib/db';

  let query = '';
  let results = [];
  let embedder;

  async function init() {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  function cosineSimilarity(a, b) {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val ** 2, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val ** 2, 0));
    return dot / (normA * normB);
  }

  async function search() {
    if (!embedder) await init();
    const queryEmb = await embedder(query, { pooling: 'mean', normalize: true });
    const queryVec = Array.from(queryEmb.data);

    const allConvs = await db.conversations.toArray();
    results = allConvs
      .map(conv => ({ conv, score: cosineSimilarity(queryVec, conv.embedding || []) }))
      .filter(r => r.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .map(r => r.conv);
  }
</script>

<div class="semantic-search p-4 bg-gray-900 rounded">
  <input bind:value={query} placeholder="Busca semântica..." class="w-full p-2 bg-gray-800 text-white rounded" />
  <button on:click={search} class="mt-2 px-4 py-2 bg-purple-600 text-white rounded">Buscar</button>
  <ul class="mt-4">
    {#each results as res}
      <li class="mb-2">{res.title} (Score: {res.score.toFixed(2)})</li>
    {/each}
  </ul>
</div>
```

Integração: Adicione ao Command Palette ou sidebar.

**Dependências:** `@xenova/transformers`.  
**Teste:** Importe conversas, busque "IA" – veja se retorna relevantes.

#### 4. Melhorias no README + Demo
**Por quê?** Aumenta visibilidade.

**Implementação Completa:**
- Atualize `README.md` com o conteúdo abaixo (completo).
- Para demo: Crie `vercel.json` e deploy via Vercel CLI (`bun add -g vercel`, `vercel deploy`).

`README.md` (versão completa):

```markdown
# Aurora PKM - Second Active Mind

Aurora PKM é um gerenciador local de conversas do ChatGPT, focado em conhecimento pessoal offline.

## Features
- Importação de conversations.json com parsing avançado (tools, citations, images).
- Armazenamento IndexedDB via Dexie.
- Busca fuzzy e filtros por modelo/tool/data.
- Visualização em 3 colunas com virtual scrolling.
- Command Palette (Ctrl+K).

## Quick Start
1. Clone: `git clone https://github.com/XterminatorX13/Aurora-Chat-Manager-`
2. Instale: `bun install`
3. Rode: `bun dev`
4. Importe seu conversations.json via UI.

## Screenshots
![Sidebar](screenshots/sidebar.png)
![Conversa Detalhada](screenshots/detail.png)
![Command Palette](screenshots/palette.gif)

## Demo Online
Veja em ação: [aurora-pkm.vercel.app](https://aurora-pkm.vercel.app)

## Roadmap
- Fase 1: Viewer básico (concluído).
- Fase 2: Grafo de conhecimento.
- Fase 3: IA local para tagging.

Licensed under MIT – veja LICENSE.
```

`vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Dependências:** Nenhuma.  
**Teste:** Commit e push, acesse o deploy – verifique se roda.

#### 5. Licença Explícita
**Por quê?** Protege e incentiva contribs.

**Implementação Completa:**
- Crie arquivo `LICENSE` com o texto MIT abaixo.
- Adicione ao README: "Licensed under MIT – veja LICENSE".

`LICENSE`:

```
MIT License

Copyright (c) 2026 Victor (XterminatorX13)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Dependências:** Nenhuma.  
**Teste:** Commit – verifique no GitHub se aparece "MIT License".

#### 6. Suporte a Imagens Geradas (DALL·E e Multimodais)
**Por quê?** Enriquece visualização.

**Implementação Completa:**
- Atualize `data.js` (já tem `parseImageGenPrompt` – adicione extração de URLs de `content_references`).
- Atualize `Message.svelte`.

Atualização em `data.js` (adicionando em `extractMessagesFromMapping`):

```javascript
// ... dentro do push de msgs
let imageUrls = [];
if (contentRefs.some(ref => ref.type === 'image_group')) {
  imageUrls = contentRefs
    .filter(ref => ref.type === 'image_group' && ref.images)
    .flatMap(ref => ref.images.filter(img => img.image_result?.content_url).map(img => img.image_result.content_url));
}

// Adicione no objeto:
imageUrls,  // Novo array de URLs
```

Atualização em `Message.svelte` (assumindo você tem um):

```svelte
<!-- src/components/Message.svelte (versão completa) -->
<script>
  export let message;
</script>

<div class="message p-4 bg-gray-800 rounded mb-4">
  <h3 class="font-bold">{message.role.toUpperCase()}</h3>
  <p>{message.textPlain}</p>
  {#if message.imageUrls && message.imageUrls.length > 0}
    <div class="images mt-2 flex flex-wrap">
      {#each message.imageUrls as url}
        <img src={url} alt="Imagem Gerada" class="w-32 h-32 object-cover rounded m-1" loading="lazy" />
      {/each}
    </div>
  {/if}
</div>
```

**Dependências:** Nenhuma.  
**Teste:** Importe conversa com DALL·E – veja se mostra thumbnails.

#### 7. Grafo de Conhecimento Simples
**Por quê?** Visualiza conexões.

**Implementação Completa:**
- Instale `bun add vis-network`.
- Crie `src/components/GraphView.svelte`.
- Atualize DB para edges (ex.: baseados em tags comuns).

Atualização em DB (ex.: `src/lib/db.js`):

```javascript
// src/lib/db.js
import Dexie from 'dexie';

const db = new Dexie('AuroraPKM');
db.version(2).stores({
  conversations: 'id, title, embedding',
  edges: '++id, from, to'  // Novo: edges entre convs
});

// Função para criar edges (chame no import worker)
async function createEdges() {
  const convs = await db.conversations.toArray();
  for (let i = 0; i < convs.length; i++) {
    for (let j = i + 1; j < convs.length; j++) {
      if (convs[i].modelSlug === convs[j].modelSlug) {  // Ex.: edge se mesmo model
        await db.edges.add({ from: convs[i].id, to: convs[j].id });
      }
    }
  }
}
```

`GraphView.svelte`:

```svelte
<!-- src/components/GraphView.svelte -->
<script>
  import { onMount } from 'svelte';
  import { Network } from 'vis-network/standalone';
  import db from '../lib/db';

  let container;
  let nodes = [];
  let edges = [];

  onMount(async () => {
    const convs = await db.conversations.toArray();
    nodes = convs.map(c => ({ id: c.id, label: c.title.slice(0, 20) + '...' }));
    edges = await db.edges.toArray();

    new Network(container, { nodes, edges }, {
      nodes: { shape: 'dot', size: 10 },
      edges: { arrows: 'to' },
      physics: { enabled: true }
    });
  });
</script>

<div bind:this={container} class="w-full h-96" />
```

Integração: Adicione ao sidebar ou nova rota.

**Dependências:** `vis-network`.  
**Teste:** Importe >2 convs com mesmo model – veja grafo com nodes conectados.

#### 8. Auto-Tagging de Conversas
**Por quê?** Categoriza automaticamente.

**Implementação Completa:**
- Instale `bun add compromise`.
- Atualize `data.js` (adicionando tags no normalize).

Atualização em `data.js` (em `normalizeConversation`):

```javascript
// src/lib/data.js
import nlp from 'compromise';

function normalizeConversation(conv) {
  // ... código existente

  // Auto-tagging
  const doc = nlp(searchText);
  const tags = [];
  if (doc.has('gpt|openai|model')) tags.push('AI');
  if (doc.has('code|python|tool')) tags.push('Coding');
  if (doc.has('pesquisa|search|browser')) tags.push('Research');
  // Mais regras...

  return {
    // ... campos existentes
    tags  // Novo array
  };
}
```

Integração: No filtro UI, adicione select com tags únicas do DB.

**Dependências:** `compromise`.  
**Teste:** Importe conversa sobre "gpt code" – veja tags ['AI', 'Coding'].

#### 9. Dark Mode Persistente e Temas Custom
**Por quê?** Melhora UX.

**Implementação Completa:**
- Atualize `App.svelte`.
- Crie `src/lib/theme.js`.

`theme.js`:

```javascript
// src/lib/theme.js
import { writable } from 'svelte/store';

export const theme = writable(localStorage.getItem('theme') || 'dark');

theme.subscribe(val => {
  localStorage.setItem('theme', val);
  document.documentElement.className = val;
});
```

`App.svelte` (adicionando):

```svelte
<!-- src/App.svelte -->
<script>
  import { theme } from './lib/theme';
  let currentTheme = 'dark';

  theme.subscribe(val => currentTheme = val);

  function toggleTheme() {
    theme.set(currentTheme === 'dark' ? 'light' : 'dark');
  }
</script>

<main class={currentTheme}>
  <!-- Seu app -->
  <button on:click={toggleTheme}>Toggle Theme</button>
</main>

<style>
  :global(.dark) { --bg: #1a202c; --text: white; }
  :global(.light) { --bg: white; --text: black; }
  main { background: var(--bg); color: var(--text); }
</style>
```

**Dependências:** Nenhuma.  
**Teste:** Clique toggle – verifique se persiste após refresh.

#### 10. Integração com Electron pra Desktop App
**Por quê?** Torna nativo.

**Implementação Completa:**
- Instale `bun add electron electron-builder concurrently`.
- Crie arquivos Electron.

`electron/main.js`:

```javascript
// electron/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL(isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../dist/index.html')}`);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

`electron/preload.js`:

```javascript
// electron/preload.js (vazio por enquanto)
window.addEventListener('DOMContentLoaded', () => {
  // Exposições se precisar
});
```

Atualize `package.json` scripts:

```json
"scripts": {
  "dev": "concurrently \"bun run dev:web\" \"bun run dev:electron\"",
  "dev:web": "vite",
  "dev:electron": "electron electron/main.js",
  "build": "vite build && electron-builder"
}
```

`electron-builder.yml`:

```yaml
appId: com.aurora.pkm
productName: Aurora PKM
directories:
  output: dist-electron
files:
  - dist/
  - electron/
win:
  target: nsis
mac:
  target: dmg
linux:
  target: AppImage
```

**Dependências:** `electron`, `electron-builder`, `concurrently`.  
**Teste:** `bun dev` – abra app desktop. `bun build` pra gerar instaladores.