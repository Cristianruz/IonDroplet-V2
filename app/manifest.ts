import type { MetadataRoute } from 'next'

// El manifest que permite instalar la app en el teléfono.
//
// EL ICONO ES SVG a propósito: Chrome lo acepta en el manifest y así no hay
// que meter binarios al repositorio ni una librería para rasterizar, que
// serían dependencias nuevas. La contra, dicha de frente: iOS prefiere PNG
// para el icono de pantalla de inicio, así que en iPhone el icono puede salir
// genérico. En Android, que es lo que se va a usar en el campo, sale bien.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'IonDroplet — Riego Inteligente',
    short_name: 'IonDroplet',
    description: 'Riego con agua ionizada: humedad, clima y avisos de la parcela.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7f8f9',
    theme_color: '#1f7a3d',
    lang: 'es-MX',
    categories: ['productivity', 'utilities'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
