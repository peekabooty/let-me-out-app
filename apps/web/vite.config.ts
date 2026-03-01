import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@repo/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  envDir: path.resolve(__dirname, '../..'),
  server: {
    port: 5173,
  },
});
