import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa'; // ✅ 1. Importa PWA
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    
    // ✅ 2. Configurazione PWA
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      devOptions: {
        enabled: true // Utile per testare in locale
      },
      
      // ✅ 3. AGGIUNTO IL BLOCCO WORKBOX PER SUPERARE IL LIMITE DI 2MB
      workbox: {
        maximumFileSizeToCacheInBytes: 10000000, // Limite alzato a 5 MB
      },

      manifest: {
        name: 'Gestionale Cantieri - Amministrazione', // Nome diverso dall'app esterna
        short_name: 'Gestionale',
        description: 'Pannello di controllo e amministrazione',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png', // Ricordati le icone in apps/gestionale/public
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  
  // --- 4. Configurazione Server (Proxy Backend) ---
  // Questa parte è FONDAMENTALE per il gestionale, non rimuoverla!
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  // --- 5. Configurazione CSS (Tailwind) ---
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer(),
      ],
    },
  },
  
  // --- 6. Alias per Monorepo ---
  resolve: {
    alias: {
      'shared-core': path.resolve(__dirname, '../../packages/shared-core'),
      'shared-ui': path.resolve(__dirname, '../../packages/shared-ui'),
    },
    dedupe: ['react', 'react-dom', 'shared-core', 'shared-ui'],
  },
});