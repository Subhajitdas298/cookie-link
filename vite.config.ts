import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Builds extension/ (TypeScript) into src/, which is what manifest.json
// actually references (background.service_worker + options_ui.page). Two
// entries in one pass: the options page (an HTML entry, bundled with its
// script/CSS) and the background service worker (a plain script entry,
// bundled to a single ES module file since dynamic import() is disallowed
// inside a running service worker). src/ is committed, the same way
// icons/*.png are — loading this repo unpacked needs no build step.
export default defineConfig({
  root: path.resolve(__dirname, 'extension/options'),
  base: './',
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'src'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        options: path.resolve(__dirname, 'extension/options/options.html'),
        background: path.resolve(__dirname, 'extension/background.ts'),
      },
      output: {
        // Entry chunk names must stay stable/unhashed: manifest.json
        // references background.js and options.html by exact path. Shared
        // chunks (e.g. common/settings.ts, pulled in by both entries) get a
        // hash so two same-named chunks can never silently collide.
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'options-assets/[name].js'),
        chunkFileNames: 'options-assets/[name]-[hash].js',
        assetFileNames: 'options-assets/[name][extname]',
      },
    },
  },
});
