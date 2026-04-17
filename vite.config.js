import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/mahjong': {
        target: 'http://127.0.0.1:9998',
        changeOrigin: true
      },
      '/ws': {
        target: 'http://127.0.0.1:9998',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
