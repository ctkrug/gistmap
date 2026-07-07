import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Relative base so the built site works under any subpath
// (e.g. apps.charliekrug.com/gistmap) without rewriting asset URLs.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    rollupOptions: {
      input: {
        // The app is the default entry; the landing page ships alongside it.
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        landing: fileURLToPath(new URL('./site/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      // Report on the pure, testable core. embed.js fetches model weights and
      // samples.js is static data; main.js / mapview.js are the DOM + canvas
      // layers, exercised via the build and manual QA rather than unit tests.
      include: ['src/lib/**'],
      exclude: ['src/lib/embed.js', 'src/lib/samples.js'],
      reporter: ['text', 'html'],
    },
  },
})
