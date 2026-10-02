// La puerta del modo demostración en el navegador.
//
// Se prende al construir con NEXT_PUBLIC_DEMO=si (así está en Vercel). Entonces
// apiFetch no sale a la red: le pregunta a esta función, que contesta desde el
// sistema simulado de este navegador. En la computadora del riego la variable
// no está y este archivo ni se descarga.
//
// El estado vive en sessionStorage: sobrevive a recargar la página y se borra
// al cerrar la pestaña. Así cada visita empieza con el sistema limpio.

import { VERSION_ESTADO, avanzar, crearEstado, sensorMudo, type Estado } from './simulacion.ts'
import { responder } from './api-demo.ts'
import { desconectarSensor, reconectarSensor, resumen, secarTierra, type ResumenDemo } from './escenarios.ts'

const CLAVE = 'iondroplet.demo'
/** Si la pestaña se quedó abierta días, mejor empezar de nuevo. */
const VIGENCIA_MS = 2 * 24 * 60 * 60 * 1000

let estado: Estado | null = null
let guardarPendiente: ReturnType<typeof setTimeout> | null = null

function cargar(ahora: number): Estado {
  if (estado) return estado
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null') as Estado | null
    if (guardado && guardado.version === VERSION_ESTADO && ahora - guardado.t < VIGENCIA_MS) {
      estado = guardado
      return estado
    }
  } catch {}
  estado = crearEstado(ahora)
  return estado
}

function guardar(): void {
  try {
    if (estado) sessionStorage.setItem(CLAVE, JSON.stringify(estado))
  } catch {}
}

// Se guarda a lo mucho cada 5 segundos y al salir de la página, no en cada
// petición: el estado pesa unos cientos de KB y la app pregunta cada 3 s.
function programarGuardado(): void {
  if (guardarPendiente) return
  guardarPendiente = setTimeout(() => {
    guardarPendiente = null
    guardar()
  }, 5000)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', guardar)
}

/** Borra todo y empieza otra vez, para la siguiente persona. */
export function reiniciarDemo(): void {
  estado = null
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {}
}

/** Seca la tierra: el automático debe empezar a regar en segundos. */
export function escenarioSecar(): void {
  const ahora = Date.now()
  secarTierra(cargar(ahora), ahora)
  guardar()
}

/** Desconecta el sensor, o lo vuelve a conectar si ya estaba desconectado. */
export function escenarioSensor(): void {
  const ahora = Date.now()
  const e = cargar(ahora)
  if (sensorMudo(e)) reconectarSensor(e, ahora)
  else desconectarSensor(e, ahora)
  guardar()
}

/** Cómo va el sistema ahora mismo, para el panel de presentación. */
export function resumenDemo(): ResumenDemo {
  const ahora = Date.now()
  const e = cargar(ahora)
  avanzar(e, ahora)
  programarGuardado()
  return resumen(e)
}

function demora(ruta: string): number {
  // Lo que en el sistema real piensa la IA tarda un poco, para que se note.
  if (ruta === 'ai/foto') return 3500
  if (ruta === 'chat' || ruta === 'ai/umbral' || ruta === 'agente/correr') return 1200
  if (ruta.startsWith('ai/')) return 600
  return 120
}

function esperar(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolver, rechazar) => {
    if (signal?.aborted) return rechazar(new DOMException('Cancelada', 'AbortError'))
    const t = setTimeout(resolver, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      rechazar(new DOMException('Cancelada', 'AbortError'))
    }, { once: true })
  })
}

async function leerCuerpo(init: RequestInit): Promise<Record<string, unknown>> {
  if (typeof init.body !== 'string' || init.body === '') return {}
  try {
    const valor = JSON.parse(init.body)
    return valor && typeof valor === 'object' ? valor : {}
  } catch {
    return {}
  }
}

/** Lo que apiFetch hace en modo demostración en lugar de ir a la red. */
export async function fetchDemo(rutaCompleta: string, init: RequestInit = {}): Promise<Response> {
  const url = new URL(rutaCompleta, 'http://demo')
  const ruta = url.pathname.replace(/^\/api\//, '')
  const metodo = (init.method ?? 'GET').toUpperCase()
  const cuerpo = await leerCuerpo(init)

  await esperar(demora(ruta), init.signal)

  const ahora = Date.now()
  const { status, cuerpo: salida } = responder(cargar(ahora), metodo, ruta, url.searchParams, cuerpo, ahora)
  programarGuardado()
  return new Response(JSON.stringify(salida), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-IonDroplet-Demo': '1' },
  })
}
