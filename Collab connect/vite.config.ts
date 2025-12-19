import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
   base: "./",
  plugins: [
    react(),
  
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'ccemb.svg',
        'cc-3d.png'
      ],
      manifest: {
        name: 'Collab Connect',
        short_name: 'CollabConnect',
        description: 'Where Brands Meet Influencers — 빠르고 투명한 인플루언서 캠페인 플랫폼.',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#317EFB',
        icons: [
          {
            src: '/cc-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/cc-logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/cc-3d.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})


import tailwindcss from '@tailwindcss/vite'

