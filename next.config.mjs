/** @type {import('next').NextConfig} */
const nextConfig = {
  // Que la respuesta no anuncie con qué está hecha la app.
  poweredByHeader: false,

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
          // y hacerlo tocar "Regar ahora" sin saberlo.
          { key: 'X-Frame-Options', value: 'DENY' },
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
