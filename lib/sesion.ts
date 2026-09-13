// La sesión del agricultor en este teléfono.
//
// El backend ya no contesta a nadie que no traiga un token: antes cualquiera
// en la misma red podía prender la bomba. El token lo da el backend después
// de que Google confirma quién eres, y vive aquí, en localStorage, para que la
// PWA siga abriendo sin pedir cuenta cada vez.
//
// Sin importaciones a propósito: así las pruebas lo cargan con el runner de
// Node sin armar nada de Next.

const CLAVE = 'iondroplet.sesion'

export interface Sesion {
  token: string
  email: string
  nombre: string
  foto: string | null
}

/** Cuándo vence el token, leído de su propio contenido. null si no se puede leer. */
export function expiraEn(token: string): number | null {
  const partes = token.split('.')
  if (partes.length !== 3) return null
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/')
    const datos = JSON.parse(atob(base64))
    return typeof datos.exp === 'number' ? datos.exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * ¿Sirve todavía? Se da por vencida un minuto antes: mejor pedir cuenta de
 * nuevo que mandar una orden a la bomba con un token que muere en el camino.
 * Esto NO valida la firma; eso lo hace el backend en cada petición.
 */
export function sesionVigente(sesion: Sesion | null, ahora = Date.now(), margenMs = 60_000): boolean {
  if (!sesion) return false
  const vence = expiraEn(sesion.token)
  return vence !== null && vence - margenMs > ahora
}

export function leerSesion(): Sesion | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const s = JSON.parse(crudo)
    if (typeof s?.token !== 'string' || typeof s?.email !== 'string') return null
    return { token: s.token, email: s.email, nombre: String(s.nombre ?? s.email), foto: s.foto ?? null }
  } catch {
    return null
  }
}

export function guardarSesion(sesion: Sesion): void {
  localStorage.setItem(CLAVE, JSON.stringify(sesion))
}

/**
 * Cierra la sesión y borra lo que el service worker guardó de la API: si no,
 * sin señal ese teléfono seguiría enseñando los datos de la parcela a quien
 * lo agarre.
 */
export async function cerrarSesion(): Promise<void> {
  try {
    localStorage.removeItem(CLAVE)
  } catch {}
  try {
    const nombres = await caches.keys()
    await Promise.all(nombres.filter(n => n.endsWith('-api')).map(n => caches.delete(n)))
  } catch {}
  window.location.replace('/entrar')
}
