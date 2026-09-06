// Dónde vive el backend.
//
// Si no se configura nada, se deduce del mismo lugar desde donde se abrió la
// app: si entras a http://192.168.3.95:3000 desde el celular, el backend es
// http://192.168.3.95:3001. Antes estaba fijo en "localhost", y desde el
// teléfono "localhost" es el teléfono mismo — por eso salía "Sin conexión".
//
// NEXT_PUBLIC_API_URL sigue mandando si está puesta, para cuando el backend
// viva en otra máquina distinta a la que sirve la app.
const PUERTO_BACKEND = 3001

function resolverApi(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${PUERTO_BACKEND}`
  }
  // Solo durante el armado en el servidor; en el navegador nunca se usa.
  return `http://localhost:${PUERTO_BACKEND}`
}

export const API_URL = resolverApi()

// El backend guarda timestamps de SQLite en UTC ("YYYY-MM-DD HH:MM:SS")
export function parseTimestampUTC(ts: string): Date {
  return new Date(ts.replace(' ', 'T') + 'Z')
}
