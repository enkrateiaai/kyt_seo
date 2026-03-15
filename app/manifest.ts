import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kundalini Yoga Tribe',
    short_name: 'KYT',
    description: 'Kriyas, Meditationen & Heilung im deutschsprachigen Raum',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0a0a0a',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
