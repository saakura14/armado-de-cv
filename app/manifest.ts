import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Armado de CV',
    short_name: 'Armado de CV',
    description: 'CV, LinkedIn y asesorías para tu búsqueda laboral.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fcfaf7',
    theme_color: '#fcfaf7',
    lang: 'es-AR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
