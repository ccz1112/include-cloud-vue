import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api/room': {
        target: 'http://127.0.0.1:9998',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      },
      '/api/mahjong': {
        target: 'http://127.0.0.1:9998',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      },
      '/api/ws': {
        target: 'http://127.0.0.1:9998',
        changeOrigin: true,
        ws: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
})
