import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Installs from a link and works offline after the first visit. The model host and the hub are never cached here.
      registerType: 'autoUpdate',
      manifest: {
        name: 'Ugatan: Offline na Payo para sa Palay at Mais',
        short_name: 'Ugatan',
        description: 'Offline na payo para sa palay at mais. Walang account, walang server.',
        lang: 'tl',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f1f5ee',
        theme_color: '#1f5c2e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  worker: { format: 'es' },
  build: { target: 'es2022' },
});
