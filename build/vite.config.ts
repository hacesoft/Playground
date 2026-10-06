import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    // outDir is src/, which also contains PHP, appinfo and templates.
    emptyOutDir: false,
    outDir: '../src',
    sourcemap: false,
    lib: {
      entry: 'frontend/main.ts',
      name: 'HcSharedAppCorePlaygroundBundle',
      formats: ['iife'],
      fileName: () => 'js/playground.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.names.some((name) => name.endsWith('.css'))
            ? 'css/playground.css'
            : 'js/playground-[name][extname]',
      },
    },
  },
})
