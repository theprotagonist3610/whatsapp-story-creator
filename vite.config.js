import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseStorageUrl = `${env.VITE_SUPABASE_URL ?? ''}/storage/v1/object/public/stickers`

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
        manifest: {
          name: 'Les Sandwichs du Docteur — Story Creator',
          short_name: 'Story Creator',
          description: 'Créez des stories WhatsApp animées pour TikTok et Facebook',
          theme_color: '#d9571d',
          background_color: '#ffe8c9',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          // Cache des assets statiques
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // Ne pas cacher les chunks ffmpeg (trop lourds + cross-origin)
          globIgnores: ['**/ffmpeg-core*'],
          runtimeCaching: [
            {
              // Cache de la preview pour usage hors ligne
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
          ],
        },
      }),
    ],

    server: {
      // Headers COOP/COEP obligatoires pour SharedArrayBuffer (ffmpeg.wasm)
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      proxy: {
        // Proxy vers le serveur Node.js FFmpeg en dev
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        // Proxy stickers Supabase → même origine pour contourner COEP
        '/stickers-proxy': {
          target: supabaseStorageUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/stickers-proxy/, ''),
        },
      },
    },

    preview: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },

    optimizeDeps: {
      // Exclure ffmpeg des optimisations Vite (ESM natif)
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
  }
})
