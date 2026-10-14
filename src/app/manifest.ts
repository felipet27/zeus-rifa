import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rifa por Zeus',
    short_name: 'Rifa Zeus',
    description: 'Administración de boletas de la rifa para la operación de Zeus',
    start_url: '/tablero',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAF8F3',
    theme_color: '#1F1F23',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
