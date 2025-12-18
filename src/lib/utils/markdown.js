import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml'; // handles html
import typescript from 'highlight.js/lib/languages/typescript';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';
import csharp from 'highlight.js/lib/languages/csharp';
import yaml from 'highlight.js/lib/languages/yaml';
import diff from 'highlight.js/lib/languages/diff';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('java', java);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('diff', diff);
import markedKatex from 'marked-katex-extension';

/**
 * Configura marked com suporte completo:
 * - GitHub Flavored Markdown (tabelas, strikethrough, taskLists)
 * - Syntax highlighting para blocos de código
 * - LaTeX/KaTeX para fórmulas matemáticas
 */

// 1. Configurar syntax highlighting
const highlightExtension = markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    }
});

// 2. Configurar KaTeX para LaTeX
const katexExtension = markedKatex({
    throwOnError: false,
    output: 'html'
});

// 3. Aplicar todas as extensões
marked.use(highlightExtension);
marked.use(katexExtension);

// 4. Configurar opções do marked
marked.setOptions({
    breaks: true,           // Quebras de linha → <br>
    gfm: true,              // GitHub Flavored Markdown (tabelas!)
    headerIds: true,        // IDs nos headers
    mangle: false,          // Não ofuscar emails
    pedantic: false,        // Modo não-pedante
});

/**
 * Converte markdown para HTML
 * Suporta: tabelas, código com syntax highlighting, LaTeX
 * 
 * Exemplos:
 * - Tabela GFM: | Header | Header | \n | --- | --- |
 * - LaTeX inline: $E = mc^2$
 * - LaTeX block: $$\int_{a}^{b} x^2 dx$$
 * - Código: ```javascript\nconst x = 1;\n```
 * 
 * @param {string} markdown - Texto em markdown
 * @returns {string} HTML renderizado
 */
export function parseMarkdown(markdown) {
    if (!markdown) return '';
    return marked.parse(markdown);
}

/**
 * Converte markdown para HTML inline (sem parágrafos)
 * @param {string} markdown - Texto em markdown
 * @returns {string} HTML renderizado inline
 */
export function parseMarkdownInline(markdown) {
    if (!markdown) return '';
    return marked.parseInline(markdown);
}

export { marked };
