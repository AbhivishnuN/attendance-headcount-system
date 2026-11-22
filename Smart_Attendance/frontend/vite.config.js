import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Listen on all network interfaces
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/student': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/sessions': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/scan': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/attendance': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/headcount': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/verification': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/reports': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
    },
  },
})
