import type { NextRequest } from 'next/server'

// Todo /api/* de la app pasa por aquí hacia el backend de la computadora del
// riego.
//
// Antes era un "rewrite" de next.config.mjs. Se cambió por esta ruta porque en
// Vercel hacía falta lo que un rewrite no hace:
// - leer BACKEND_URL al momento, no al construir;
// - agregar la clave del túnel (TUNEL_CLAVE), que el navegador nunca ve;
// - no dejar pasar desde internet las rutas por donde el ESP32 manda la
//   humedad sin sesión;
// - aguantar el minuto que tarda el diagnóstico por foto.
// En la computadora del riego funciona igual que antes, contra localhost:3001.

export const dynamic = 'force-dynamic'
// El diagnóstico por foto tarda de 30 a 90 s.
export const maxDuration = 180

const PASAN_AL_BACKEND = ['content-type', 'authorization', 'x-iondroplet-dueno', 'accept']
const REGRESAN_AL_NAVEGADOR = ['content-type', 'retry-after', 'cache-control']
const RUTAS_DEL_APARATO = ['esp/data', 'sensors/data']

function backend(): string {
  return (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/+$/, '')
}

function esLocal(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url)
}

async function reenviar(req: NextRequest, { params }: { params: Promise<{ ruta: string[] }> }) {
  const { ruta } = await params
  const camino = ruta.map(encodeURIComponent).join('/')
  const base = backend()

  if (!esLocal(base) && RUTAS_DEL_APARATO.includes(ruta.join('/'))) {
    return Response.json({ error: 'No disponible desde internet.' }, { status: 404 })
  }

  const cabeceras = new Headers()
  for (const nombre of PASAN_AL_BACKEND) {
    const valor = req.headers.get(nombre)
    if (valor) cabeceras.set(nombre, valor)
  }
  if (process.env.TUNEL_CLAVE) cabeceras.set('x-iondroplet-tunel', process.env.TUNEL_CLAVE)
  // ngrok enseña una página de aviso a los navegadores; esto es un servidor.
  cabeceras.set('ngrok-skip-browser-warning', '1')

  const conCuerpo = req.method !== 'GET' && req.method !== 'HEAD'
  try {
    const res = await fetch(`${base}/api/${camino}${req.nextUrl.search}`, {
      method: req.method,
      headers: cabeceras,
      body: conCuerpo ? req.body : undefined,
      // Necesario para mandar el cuerpo como flujo (fotos) sin juntarlo antes.
      duplex: 'half',
      cache: 'no-store',
      redirect: 'manual',
    } as RequestInit & { duplex: 'half' })

    const salida = new Headers()
    for (const nombre of REGRESAN_AL_NAVEGADOR) {
      const valor = res.headers.get(nombre)
      if (valor) salida.set(nombre, valor)
    }
    return new Response(res.body, { status: res.status, headers: salida })
  } catch {
    // La computadora del riego está apagada, sin internet o sin el túnel.
    return Response.json(
      { error: 'No hay conexión con la computadora del riego.' },
      { status: 502 }
    )
  }
}

export { reenviar as GET, reenviar as POST, reenviar as PUT, reenviar as PATCH, reenviar as DELETE }
