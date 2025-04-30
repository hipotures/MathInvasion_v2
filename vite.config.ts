/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // We will register manually in main.ts
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,ogg,yml}'], // Cache code, styles, assets, and configs
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'vite.svg', 'assets/icons/*.png'], // Include necessary static assets
      manifest: {
        name: 'Math Invasion v2',
        short_name: 'MathInvade2',
        description: 'A Space Invaders / Tower Defense hybrid game built with Phaser 3.',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#ffffff',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'icons/icon-192x192.png', // Relative to output dir (usually 'dist')
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512x512.png', // Relative to output dir
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  // Optional: Define base if deploying to a subdirectory
  // base: '/your-repo-name/',
  build: {
    // Optional: Configure build options if needed
    // chunkSizeWarningLimit: 1000, // Example
  },
  server: {
    // Optional: Configure dev server options if needed
    // port: 3000, // Example
  },
  // Add Vitest configuration
  test: {
    globals: true, // Use global APIs like describe, it, expect
    environment: 'jsdom', // Use jsdom for browser-like environment (provides 'window')
    // setupFiles: './tests/setup.ts', // Optional setup file
  },
});
