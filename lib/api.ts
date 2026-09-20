import { leerSesion, olvidarSesion, pedirSesion } from './sesion'
import { leerLlave } from './dueno'

// Dónde vive el backend.
//
// El navegador le pide la API a LA MISMA dirección de la que abrió la app, y
// Next la reenvía al backend (rewrites en next.config.mjs). Así funciona
// igual en http://localhost:3000, en http://192.168.x.x:3000 desde el
// teléfono y detrás de un túnel https: una sola dirección, sin abrir el
// puerto 3001 hacia afuera y sin CORS.
//
// NEXT_PUBLIC_API_URL sigue mandando si está puesta, para cuando el backend
// viva en otra máquina y se le quiera hablar directo.
function resolverApi(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') return ''
  // Solo durante el armado en el servidor; en el navegador nunca se usa.
  return 'http://localhost:3001'
}

export const API_URL = resolverApi()

/**
 * Toda llamada al backend pasa por aquí: agrega el token de la sesión si hay.
 *
 * Sin sesión se puede VER el sistema: el backend contesta las lecturas. Si
 * alguien sin sesión (o con una vencida) intenta OPERAR, el backend dice 401
 * y aquí se avisa para ofrecerle entrar. Los GET que dan 401 son de la IA:
 * esos se callan, porque cada pantalla pide su consejo y no se va a pedir
 * "entra" en todas. Una prueba revisa que
 * ningún archivo llame a fetch contra la API por fuera de esta función.
 */
export async function apiFetch(ruta: string, init: RequestInit = {}): Promise<Response> {
  const sesion = leerSesion()
  const cabeceras = new Headers(init.headers)
  if (sesion) cabeceras.set('Authorization', `Bearer ${sesion.token}`)
  // Solo la tiene la computadora del dueño; es lo que abre la IA.
  const llave = typeof window !== 'undefined' ? leerLlave() : null
  if (llave) cabeceras.set('x-iondroplet-dueno', llave)
  const res = await fetch(`${API_URL}${ruta}`, { ...init, headers: cabeceras })
  if (res.status === 401 && typeof window !== 'undefined') {
    if (sesion) olvidarSesion()
    const metodo = (init.method ?? 'GET').toUpperCase()
    if (metodo !== 'GET') pedirSesion()
  }
  return res
}

// El backend guarda timestamps de SQLite en UTC ("YYYY-MM-DD HH:MM:SS")
export function parseTimestampUTC(ts: string): Date {
  return new Date(ts.replace(' ', 'T') + 'Z')
}
