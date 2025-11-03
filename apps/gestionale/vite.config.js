import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';

// ✅ Definisce '__dirname' per i moduli ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  
  plugins: [react()],
  server: {
    proxy: {
      // Qualsiasi richiesta che inizia con '/api' verrà inoltrata al backend
      '/api': {
        target: 'http://localhost:3002', // L'indirizzo del tuo server backend
        changeOrigin: true, // Necessario per il corretto funzionamento del proxy
        rewrite: (path) => path.replace(/^\/api/, ''), // Rimuove '/api' dal percorso prima di inviarlo
      },
    },
  },

  css: {
    postcss: {
      // ✅ Usa la struttura a oggetto per coerenza
      config: path.resolve(__dirname, '../../postcss.config.js'),
    }
  },
  
  resolve: {
    // ✅ Definisce gli alias per i pacchetti condivisi
    alias: {
      'shared-core': path.resolve(__dirname, '../../packages/shared-core'),
      'shared-ui': path.resolve(__dirname, '../../packages/shared-ui'),
    },
    // ✅ Aggiunge 'dedupe' per evitare duplicati di React nel monorepo
    dedupe: ['react', 'react-dom', 'shared-core', 'shared-ui'],
  },
})