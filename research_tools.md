# 🕵️ ChatGPT Tools Classification

Análise completa de todas as ferramentas do menu do ChatGPT: quais são Tool Calls vs puro UI.

---

## ⚡ TOOLS COM FUNCTION CALLS (detectáveis no JSON)

| Ferramenta | Tool Name | Detecção |
|------------|-----------|----------|
| **Busca na Web** | `web.run` | `author.name: "web.run"` |
| **Criar Imagem** | `t2uay3k.sj1i4kz` | `author.name.startsWith("t2uay3k")` |
| **Lousa (Canvas)** | `canmore.create_textdoc` | `author.name.startsWith("canmore")` |
| **Investigar** | `research_kickoff_tool.*` | `async_task_type: "research"` |
| **File Search** | `file_search` | `author.name: "file_search"` |

### Sub-ferramentas de Deep Research:
- `research_kickoff_tool.clarify_with_text` - Clarificação antes de começar
- `research_kickoff_tool.start_research_task` - Início da pesquisa

---

## 🎨 PURO UI (sem Tool Calls - apenas triggers de modo)

| Ferramenta | Detecção no JSON | Comportamento |
|------------|------------------|---------------|
| **Pensando** | `reasoning_level: "detailed"` | Parâmetro de modelo |
| **Estudar e aprender** | `is_study_mode: true` | Flag global |
| **Questionários** | Usa Canvas + prompts | Puro prompt + canmore |
| **Adicionar fotos/arquivos** | `attachments[]` ou `multimodal_text` | Anexo ao request |
| **Google Drive** | OAuth externo | Não aparece no export |
| **Pesquisa de Produtos** | `web.run` + renderização | Mesmo que busca web |
| **Explorar apps (GPTs)** | `gizmo` metadata | Referência a GPT custom |
| **Seu ano com ChatGPT** | Prompt especial | Puro conteúdo |

---

## 📊 Resumo para Aurora

### ✅ JÁ DETECTAMOS:
1. `web.run` → Web Search
2. `t2uay3k.*` → Image Gen
3. `canmore.*` → Canvas (com viewer!)
4. `research_kickoff_tool.*` → Deep Research
5. `file_search` → Busca em arquivos

### 📝 PODEMOS ADICIONAR:
- `is_study_mode` → Badge "Modo Estudo"
- `reasoning_level` → Badge "Pensando"
- `gizmo` metadata → Badge com nome do GPT

### 💡 CONCLUSÃO:
A maioria das ferramentas do menu são **UI-only triggers** que:
1. Mudam parâmetros do modelo (`reasoning_level`)
2. Ativam modos (`is_study_mode`)
3. Apenas formatam o prompt de forma especial

**Apenas 5 ferramentas geram `role: "tool"` no JSON!**
