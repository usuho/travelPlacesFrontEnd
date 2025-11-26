import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    legacy({
      targets: ['defaults', 'Android >= 5', 'iOS >= 11'],
      modernPolyfills: true,
      renderLegacyChunks: true,
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    }),
  ],
  base: './',
  server: {
    hmr: {
      overlay: false, // disable error overlay to avoid lock overlay blocking UI
    },
    watch: {
      // more resilient on Windows/AV/OneDrive file locks
      usePolling: true,
      interval: 200,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
