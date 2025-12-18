import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: './', // Important for Electron to load assets with relative paths

  build: {
    // Code Splitting Optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Markdown rendering libs
          'markdown-renderer': ['marked', 'marked-highlight', 'marked-katex-extension'],
          // Syntax highlighting (heavy)
          'syntax-highlighter': ['highlight.js'],
          // Math rendering (heavy)
          'math-renderer': ['katex'],
          // Rich text editor (TipTap - heavy)
          'rich-text-editor': [
            '@tiptap/core',
            '@tiptap/starter-kit',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-bubble-menu'
          ],
          // Icons (Lucide)
          'icons': ['lucide-svelte'],
          // Database
          'database': ['dexie'],
          // Svelte runtime
          'svelte-runtime': ['svelte', 'svelte/internal'],
        }
      }
    },
    // Limite do warning (500KB para chunks)
    chunkSizeWarningLimit: 500,
    // Minificação agressiva com esbuild
    minify: 'esbuild',
    // Target moderno para menos polyfills
    target: 'es2020',
  }
})
