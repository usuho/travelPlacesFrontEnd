import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
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
