import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path'; // <-- ✅ LA RIGA MANCANTE
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  
  css: {
    postcss: path.resolve(__dirname, '../../postcss.config.js'),
  },
  
  resolve: {
    alias: {
      'shared-core': path.resolve(__dirname, '../../packages/shared-core'),
      'shared-ui': path.resolve(__dirname, '../../packages/shared-ui'),
    },
    dedupe: ['react', 'react-dom', 'shared-core', 'shared-ui'],
  },
})