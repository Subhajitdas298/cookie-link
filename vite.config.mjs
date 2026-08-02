import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Builds options-src/ (React + MUI) into src/options.html + src/options-assets/,
// which is what manifest.json's options_ui.page actually points at. src/
// also holds background.js and common/settings.js (hand-written, unbundled),
// so emptyOutDir stays false — this build must not wipe those.
export default defineConfig({
  root: path.resolve(__dirname, 'options-src'),
  base: './',
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'src'),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'options-src/options.html'),
      output: {
        entryFileNames: 'options-assets/[name].js',
        chunkFileNames: 'options-assets/[name].js',
        assetFileNames: 'options-assets/[name][extname]',
      },
    },
  },
});
