import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' lets the build run from any sub-path (e.g. GitHub Pages /repo-name/)
export default defineConfig({
  base: './',
  plugins: [react()],
})
