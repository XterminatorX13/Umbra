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
          // Markdown rendering libs (grandes)
          'markdown-renderer': ['marked', 'marked-highlight', 'marked-katex-extension'],
          // Syntax highlighting
          'syntax-highlighter': ['highlight.js'],
          // Math rendering
          'math-renderer': ['katex'],
          // Svelte runtime
          'svelte-runtime': ['svelte', 'svelte/internal'],
        }
      }
    },
    // Aumenta o limite do warning (opcional, mas agora está bem otimizado)
    chunkSizeWarningLimit: 600,
    // Minificação com esbuild (mais rápido e já vem com Vite)
    minify: 'esbuild',
  }
})
