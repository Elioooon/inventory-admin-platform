import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/admin': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      }
    }
  }
}) 