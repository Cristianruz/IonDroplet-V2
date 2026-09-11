// Service worker de IonDroplet.
//
// EL PROBLEMA QUE RESUELVE: en el campo la señal se cae. Hasta ahora, sin
// señal la aplicación no abría — pantalla en blanco. Eso estaba señalado en
// el diagnóstico como una discrepancia: se decía que era PWA y no lo era.
//
// LA REGLA QUE NO SE NEGOCIA: servir un dato viejo está bien; servirlo como
// si fuera de ahorita, no. Cada respuesta que sale del caché lleva la cabecera
// 'X-IonDroplet-Cache', y la aplicación la usa para decir "sin conexión" y
// para enseñar la antigüedad del dato en vez de fingir que está al día.

const VERSION = 'iondroplet-v1'
const CACHE_APP = `${VERSION}-app`
const CACHE_API = `${VERSION}-api`

// Endpoints cuyo contenido SE PUEDE servir viejo porque el propio dato dice
// cuándo se midió, o porque cambia despacio. Los que reportan estado en vivo
// (esp/status, alertas/resumen) NO se guardan: servirlos viejos haría creer
// que la bomba está como no está.
const API_CACHEABLE = [
  '/api/sensors/latest',
  '/api/sensors/history',
  '/api/sensors/resumen',
  '/api/clima',
  '/api/agua/balance',
  '/api/parcelas',
  '/api/thresholds',
  '/api/cultivos/guia',
  '/api/logs',
  '/api/fertirriego',
  '/api/alertas',
]

self.addEventListener('install', event => {
  // No se precarga nada: las rutas de Next llevan hash y cambian en cada
  // compilación. Se guardan conforme se visitan, que además respeta lo que
  // el agricultor de verdad usa.
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys()
      await Promise.all(
        nombres.filter(n => !n.startsWith(VERSION)).map(n => caches.delete(n))
      )
      await self.clients.claim()
    })()
  )
})

/** Copia una respuesta agregándole la marca de que viene del caché. */
async function marcarComoCache(respuesta) {
  const cuerpo = await respuesta.blob()
  const cabeceras = new Headers(respuesta.headers)
  cabeceras.set('X-IonDroplet-Cache', '1')
  return new Response(cuerpo, {
    status: respuesta.status,
    statusText: respuesta.statusText,
    headers: cabeceras,
  })
}

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // --- API del backend (otro puerto) ---
  if (url.pathname.startsWith('/api/')) {
    if (!API_CACHEABLE.some(p => url.pathname.startsWith(p))) return
    event.respondWith(
      (async () => {
        try {
          const red = await fetch(req)
          if (red && red.ok) {
            const cache = await caches.open(CACHE_API)
            cache.put(req, red.clone())
          }
          return red
        } catch (e) {
          const guardada = await caches.match(req)
          if (guardada) return marcarComoCache(guardada)
          throw e
        }
      })()
    )
    return
  }

  // Sólo se toca lo de este origen de aquí en adelante.
  if (url.origin !== self.location.origin) return

  // --- Estáticos de Next: llevan hash, así que el caché nunca queda viejo ---
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const guardada = await caches.match(req)
        if (guardada) return guardada
        const red = await fetch(req)
        if (red && red.ok) {
          const cache = await caches.open(CACHE_APP)
          cache.put(req, red.clone())
        }
        return red
      })()
    )
    return
  }

  // --- Páginas: primero la red, y si no hay, la última que se vio ---
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const red = await fetch(req)
          if (red && red.ok) {
            const cache = await caches.open(CACHE_APP)
            cache.put(req, red.clone())
          }
          return red
        } catch (e) {
          const guardada = (await caches.match(req)) || (await caches.match('/'))
          if (guardada) return guardada
          throw e
        }
      })()
    )
    return
  }

  // --- El resto (icono, manifest): caché con respaldo de red ---
  event.respondWith(
    (async () => {
      const guardada = await caches.match(req)
      if (guardada) return guardada
      try {
        const red = await fetch(req)
        if (red && red.ok) {
          const cache = await caches.open(CACHE_APP)
          cache.put(req, red.clone())
        }
        return red
      } catch (e) {
        throw e
      }
    })()
  )
})
