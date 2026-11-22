import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' lets the built site work on GitHub Pages / Vercel under any path
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // Ask before swapping to a new version, so nobody is interrupted mid-invoice
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: './',
        name: 'KovaBill',
        short_name: 'KovaBill',
        description: 'Create, send and track invoices. Your data stays on your device.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f1f1eb',
        theme_color: '#f1f1eb',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'New invoice', url: './#/new', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Invoices', url: './#/invoices', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        // Cache the whole app (incl. fonts) so it works fully offline
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Only precache Latin font subsets; others still load on demand
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
