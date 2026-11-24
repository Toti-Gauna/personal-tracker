/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages sirve el repo en /personal-tracker/
const base = process.env.TRAZO_BASE ?? '/personal-tracker/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // El registro del service worker no frena el primer cuadro.
      injectRegister: 'script-defer',
      includeAssets: ['trazo.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Trazo',
        short_name: 'Trazo',
        description: 'Tu día, marcado a mano.',
        lang: 'es',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0c0d0e',
        theme_color: '#0c0d0e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'trazo.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // vite-plugin-pwa solo las prende solo con injectRegister 'auto': con 'script-defer' hay que pedirlas. Sin ellas, la versión nueva
        // espera a que cierres la app del todo y el teléfono se queda con la vieja (pasó entre el 23 y el 24 de noviembre).
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
});
