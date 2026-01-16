# 🕵️ Análise de Ferramentas do ChatGPT (Internal Tools & Identifiers)

Esta pesquisa técnica documenta os identificadores internos e assinaturas JSON das ferramentas do ChatGPT, atualizada com dados de engenharia reversa e análise de exports recentes (GPT-5.2).

## 1. 🎨 Lousa (Canvas) / TextDocs
Internamente conhecido como **Canmore**. É o sistema para documentos persistentes e editáveis lado-a-lado.

*   **Internal Tool Name:** `canmore`
*   **Function Call:** `canmore.create_textdoc`, `canmore.update_textdoc`, `canmore.comment_textdoc`
*   **Assinatura JSON:**
    ```json
    "author": { "role": "tool", "name": "canmore.create_textdoc" },
    "metadata": {
      "canvas": {
        "textdoc_id": "TextDoc ID (UUID)",
        "textdoc_type": "document" | "code/python" | "code/javascript" | ...,
        "title": "Título do Documento",
        "create_source": "model"
      }
    }
    ```
*   **Integração:** O `textdoc_id` é a chave primária. Deltas de edição e comentários subsequentes referenciarão este ID.

## 2. 🕵️ Investigar (Deep Research)
Ferramenta agêntica assíncrona para pesquisas complexas. Internamente prefixada como **deepresch**.

*   **Internal ID Prefix:** `deepresch_` (ex: `deepresch_6965bdc1...`)
*   **Assinatura JSON:**
    ```json
    "metadata": {
      "async_task_type": "research",
      "async_task_id": "deepresch_[UUID]",
      "async_completion_id": "deepresch_[UUID]",
      "async_task_title": "Título da Pesquisa",
      "is_async_task_result_message": true
    }
    ```
*   **Comportamento:** Gera uma mensagem de placeholder inicial e depois atualiza (ou envia nova mensagem) com o relatório final estruturado.

## 3. 🖼️ ChatGPT Image (antigo DALL-E)
A geração de imagens agora é unificada no pipeline "ChatGPT Image", mas mantém identificadores legados e estruturas de metadados do DALL-E.

*   **Internal Tool Name:** `t2uay3k.sj1i4kz` (Descoberto em exports GPT-5)
*   **Status:** O nome `dalle` ainda é usado extensivamente nas chaves de metadados, mesmo com a mudança de marca.
*   **Assinatura JSON:**
    ```json
    "author": { "role": "tool", "name": "t2uay3k.sj1i4kz" },
    "metadata": {
      "dalle": { "gen_id": "...", "prompt": "...", "seed": 123... },
      "image_gen_async": true,
      "image_gen_title": "Título da Geração"
    },
    "content": {
        "content_type": "multimodal_text",
        "parts": [{ "asset_pointer": "sediment://..." }]
    }
    ```
*   **Nota:** A string `sediment://` indica um recurso interno persistido blob storage da OpenAI.

## 4. 🛒 Pesquisa de Produtos & Browser
Não existe uma tool isolada "Product Search". É uma *renderização* especializada de resultados do `browser`.

*   **Tool:** `browser` / `mbrowser`
*   **Detecção:**
    *   `citation_format_type: "tether_v4"` (Indica citação rica/cards)
    *   Query strings relacionadas a "shopping", "price", "buy".
    *   Templates visuais (ex: `bento`, `shopping`) nos metadados de resposta.

---
**Observação de Implementação:** Para o Aurora, o parser deve ser resiliente a mudanças nesses IDs (`t2uay3k`, `canmore`), priorizando a detecção via chaves de estrutura (`metadata.canvas`, `metadata.dalle`) que tendem a ser mais estáveis que os nomes das funções internas.
