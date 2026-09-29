import type { MetadataRoute } from 'next'

import { LIGHT_BG, LIGHT_SURFACE } from '@/lib/app-colours'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vela',
    short_name: 'Vela',
    lang: 'ja',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: LIGHT_SURFACE,
    background_color: LIGHT_BG,
    icons: [
      { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/pwa/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
