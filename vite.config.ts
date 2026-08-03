import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

const REMOTE_ORIGIN = 'http://5.183.189.45:7777';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    proxy: {
      '/api/v1': {
        target: REMOTE_ORIGIN,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1/, '/dvsh.ru/api/v1'),
      },
    },
  },
});
