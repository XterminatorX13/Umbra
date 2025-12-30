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
import plaintext from 'highlight.js/lib/languages/plaintext';

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
hljs.registerLanguage('plaintext', plaintext);
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

// 3. Wiki Links Extension ([[Concept]] or [[Concept|Label]])
const wikiLinkExtension = {
    name: 'wikiLink',
    level: 'inline',
    tokenizer(src) {
        const rule = /^\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/;
        const match = rule.exec(src);
        if (match) {
            return {
                type: 'wikiLink',
                raw: match[0],
                target: match[1].trim(),
                label: match[2] ? match[2].trim() : match[1].trim()
            };
        }
    },
    renderer(token) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="wiki-link-icon" style="margin-right: 4px; opacity: 0.7;"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;
        return `<a href="#" class="wiki-link" data-concept="${token.target}">${icon}${token.label}</a>`;
    }
};

// 4. Aplicar todas as extensões
marked.use(highlightExtension);
marked.use(katexExtension);
marked.use({ extensions: [wikiLinkExtension] });

// 5. Configurar opções do marked
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
