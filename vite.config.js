import { defineConfig } from 'vite'

// Relative base works on GitHub Pages (project or user site) without knowing the repo name.
export default defineConfig({
  base: './',
})
