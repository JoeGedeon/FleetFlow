import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/FleetFlow/',
  server: {
    host: true,
    port: 3000
  }
})
