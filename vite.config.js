import { defineConfig } from 'vite'

// Relative base so the built site works under any subpath
// (e.g. apps.charliekrug.com/gistmap) without rewriting asset URLs.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
})
