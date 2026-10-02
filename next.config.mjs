/** @type {import('next').NextConfig} */
const nextConfig = {
  // Que la respuesta no anuncie con qué está hecha la app.
  poweredByHeader: false,

  // Para armar la demostración en esta misma computadora sin pisar la
  // aplicación real que sirve INICIAR_SISTEMA.bat desde .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // La app y la API salen por la misma dirección: /api/* lo reenvía al
  // backend app/api/[...ruta]/route.ts, que lee BACKEND_URL al momento (en la
  // computadora del riego, localhost:3001). En Vercel corre la demostración
  // (NEXT_PUBLIC_DEMO=si) y /api no reenvía nada.

  // La pantalla se llamaba "Mi parcela" en /parcela. Los enlaces viejos siguen
  // llegando.
  async redirects() {
    return [{ source: '/parcela', destination: '/cultivo', permanent: false }]
  },

  // Cabeceras de seguridad en todas las páginas.
  // No hay Content-Security-Policy todavía: el backend vive en otro puerto con
  // una IP que cambia según la red, y una política mal puesta deja la app en
  // blanco el día del pitch. Queda pendiente para cuando haya un dominio fijo.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Nadie puede meter la app en un iframe para engañar al agricultor
          // y hacerlo tocar "Regar ahora" sin saberlo. La demostración sí se
          // enmarca a sí misma (el celular de /presentacion), pero ningún otro
          // sitio puede: SAMEORIGIN. La app real se queda en DENY.
          { key: 'X-Frame-Options', value: process.env.NEXT_PUBLIC_DEMO === 'si' ? 'SAMEORIGIN' : 'DENY' },
          // El botón de Google necesita ver el origen: por eso no es no-referrer.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Cámara para la foto de la planta y ubicación para el clima; nada más.
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=(), payment=()' },
        ],
      },
    ]
  },
}

export default nextConfig
