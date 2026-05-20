import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy all /analyze, /predict, /history, /chat, /health calls to backend
      '/analyze': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/predict': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/history': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/chat': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/outputs': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
