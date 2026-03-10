import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        changelog: resolve(__dirname, 'src/changelog.html'),
        scoreboard: resolve(__dirname, 'src/scoreboard.html'),
      },
    },
  },
  server: {
    port: 2323,
    host: true,
  },
});
