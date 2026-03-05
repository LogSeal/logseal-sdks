import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@logseal/react/styles.css': path.resolve(__dirname, '../react/src/styles/base.css'),
      '@logseal/react': path.resolve(__dirname, '../react/src/index.ts'),
    },
  },
});
