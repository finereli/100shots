// pwa-kit: shell/vite.config.ts v9
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { buildNumber, pwaOptions } from './shared/build/pwa-build'

// Seams: MAJOR, the manifest, includeAssets.
const MAJOR = 1

export default defineConfig({
  define: {
    __BUILD__: JSON.stringify(buildNumber(MAJOR)),
  },
  resolve: {
    // Single-app repo: shared/ sits beside src/ rather than above it.
    alias: { $shared: fileURLToPath(new URL('./shared', import.meta.url)) },
  },
  plugins: [
    svelte(),
    VitePWA(
      pwaOptions({
        includeAssets: ['icons/*.png'],
        // Static pages for people and crawlers, served as files, not the app shell.
        navigateFallbackDenylist: [
          /^\/api\//, /^\/icons\//, /^\/fonts\//, /^\/reset(\.html)?$/, /^\/oauth\//, /^\/mcp/, /^\/\.well-known\//,
          /^\/about(\.html)?$/, /^\/[\w-]+\.(txt|xml)$/,
        ],
        // The push and notification-click handlers (nightly reminders).
        workbox: { importScripts: ['/push-sw.js'] },
        manifest: {
          name: '100 Shots',
          short_name: '100 Shots',
          description: 'Count your practice backwards from 100. Expect 100 bad attempts, and practice in peace.',
          lang: 'en',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          // Android paints the navigation bar with these for the life of the
          // installed app (Samsung, 3-button nav, showed theme_color there),
          // so both are the dark surface Eli uses. The status bar follows the
          // theme-color meta at runtime, light or dark.
          background_color: '#1e1e2e',
          theme_color: '#1e1e2e',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      })
    ),
  ],
})
