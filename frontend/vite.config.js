import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Tudo que começar com /api é repassado para o back-end (Express).
    // Assim o front chama fetch('/api/...') sem se preocupar com porta ou CORS.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
