<script>
    import { parseMarkdown } from "$lib/utils/markdown.js";
    import "../lib/styles/markdown.css";

    // Exemplo completo de markdown com todas as features
    const markdownDemo = `# Demonstração Completa de Markdown

## 📝 Texto e Formatação

Este é um parágrafo com **negrito**, *itálico*, e ~~tachado~~.

Também temos \`código inline\` e [links](https://example.com).

## 📊 Tabelas

| Feature | Suportado | Exemplo |
|---------|-----------|---------|
| Tabelas | ✅ Sim | Esta tabela! |
| LaTeX | ✅ Sim | $E = mc^2$ |
| Código | ✅ Sim | Veja abaixo |
| Highlight | ✅ Sim | JavaScript, Python, etc. |

## 🔢 Fórmulas Matemáticas (LaTeX)

Fórmula inline: $f(x) = x^2 + 2x + 1$

Fórmula em bloco:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

Fórmula de Bhaskara:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

## 💻 Código com Syntax Highlighting

### JavaScript
\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55
\`\`\`

### Python
\`\`\`python
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

print(quick_sort([3, 6, 8, 10, 1, 2, 1]))
\`\`\`

## 📋 Listas

### Lista não-ordenada:
- Item 1
- Item 2
  - Subitem 2.1
  - Subitem 2.2
- Item 3

### Lista ordenada:
1. Primeiro
2. Segundo
3. Terceiro

### Task List:
- [x] Feature implementada
- [x] Testes escritos
- [ ] Deploy em produção

## 💬 Blockquote

> "A imaginação é mais importante que o conhecimento."
> — Albert Einstein

## 🎨 Mais Recursos

---

Horizontal rule acima e abaixo:

---

**Combinações:** Você pode ***combinar negrito e itálico***, usar \`código com **negrito**\`, e muito mais!
`;

    $: htmlContent = parseMarkdown(markdownDemo);
</script>

<div class="demo-container">
    <h1 class="demo-title">
        🎨 Markdown Completo com LaTeX & Syntax Highlighting
    </h1>

    <div class="markdown-content">
        {@html htmlContent}
    </div>
</div>

<style>
    .demo-container {
        max-width: 900px;
        margin: 2rem auto;
        padding: 2rem;
        background: var(--bg-secondary, #0f172a);
        border-radius: 12px;
        border: 1px solid var(--border-color, #334155);
    }

    .demo-title {
        text-align: center;
        color: var(--text-primary, #f1f5f9);
        margin-bottom: 2rem;
        font-size: 2rem;
        font-weight: 700;
    }
</style>
