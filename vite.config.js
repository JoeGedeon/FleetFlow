import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // No base path needed — Netlify serves from root.
  // (GitHub Pages deployments would need base: '/FleetFlow/')
  server: {
    host: true,
    port: 3000
  }
});
