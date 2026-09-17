import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa'; // ✅ 1. Importa il plugin
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    
    // ✅ 2. Configurazione PWA per l'Offline
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      devOptions: {
        enabled: true // Permette di testare l'offline anche su localhost
      },
      
      // ✅ 3. AGGIUNTO IL BLOCCO WORKBOX PER SUPERARE IL LIMITE DI 2MB
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000, // Limite alzato a 5 MB
      },

      manifest: {
        name: 'Gestionale Cantieri - App Operativa',
        short_name: 'Cantieri App',
        description: 'App per la gestione cantieri, presenze e DDT in mobilità',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png', // Assicurati di mettere queste immagini in /public
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
  
  // --- La tua configurazione esistente (Invariata) ---
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
});