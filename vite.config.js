import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Published under a "BrokerPortal" virtual directory for now — change this (and
  // BrowserRouter's basename in main.jsx, and public/web.config's rewrite target) together
  // if that path is renamed once confirmed.
  base: '/',
})
