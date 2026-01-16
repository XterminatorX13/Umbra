import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: './', // Important for Electron to load assets with relative paths

  build: {
    outDir: 'release/web',
    rollupOptions: {
      output: {
        manualChunks: {
          'svelte-runtime': ['svelte', 'svelte/internal', 'svelte/store'],
          'markdown': ['marked'],
          'math-renderer': ['katex'],
          'syntax-highlighter': ['highlight.js'],
          'icons': ['lucide-svelte'],
          'database': ['dexie'],
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
