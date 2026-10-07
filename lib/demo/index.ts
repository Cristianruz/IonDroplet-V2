// La puerta del modo demostración en el navegador.
//
// Se prende al construir con NEXT_PUBLIC_DEMO=si (así está en Vercel). Entonces
// apiFetch no sale a la red: le pregunta a esta función, que contesta desde el
// sistema simulado de este navegador. En la computadora del riego la variable
// no está y este archivo ni se descarga.
//
// El estado vive en sessionStorage: sobrevive a recargar la página y se borra
// al cerrar la pestaña. Así cada visita empieza con el sistema limpio.
//
// Lo simulado es el cultivo. El clima es el real de Chihuahua y lo que en el
// sistema real hace la IA (chat, consejos, análisis, punto de riego, agente y
// foto) lo contesta Claude de verdad, por el servidor de la demostración. Si
// la IA no contesta, la pantalla dice que no pudo, igual que con el backend:
// nunca se pone un texto armado en su lugar.

import {
  MIN,
  VERSION_ESTADO,
  aplicarDecisionDelAgente,
  avanzar,
  crearEstado,
  humedadActual,
  lloviendo,
  puntoIdeal,
  sensorMudo,
  type Estado,
} from './simulacion.ts'
import { responder } from './api-demo.ts'
import { desconectarSensor, llover, reconectarSensor, resumen, secarTierra, type ResumenDemo } from './escenarios.ts'
import { climaReal, fijarClimaReal } from './clima.ts'
import { contextoDeFoto, contextoDelSistema, indicadores, sincronizarAlertasDelClima } from './contexto-ia.ts'
import { climaGuardado, preguntarALaIA, traerClimaReal, type RespuestaIA } from './conexion.ts'

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
  olvidarLoDeLaIA()
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {}
}

/** Seca la tierra: el automático debe empezar a regar en segundos. */
export function escenarioSecar(): void {
  const ahora = Date.now()
  secarTierra(cargar(ahora), ahora)
  olvidarLoDeLaIA()
  guardar()
}

/** Desconecta el sensor, o lo vuelve a conectar si ya estaba desconectado. */
export function escenarioSensor(): void {
  const ahora = Date.now()
  const e = cargar(ahora)
  if (sensorMudo(e)) reconectarSensor(e, ahora)
  else desconectarSensor(e, ahora)
  olvidarLoDeLaIA()
  guardar()
}

/** Que llueva tres minutos sobre el cultivo. */
export function escenarioLlover(): void {
  const ahora = Date.now()
  llover(cargar(ahora), ahora)
  olvidarLoDeLaIA()
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
  // Las respuestas de reserva tardan un poco, como tardaría la IA.
  if (ruta === 'ai/foto') return 1500
  if (ruta === 'chat' || ruta === 'ai/umbral' || ruta === 'agente/correr') return 600
  if (ruta.startsWith('ai/')) return 300
  return 120
}

// --- El clima real ---

const CLIMA_VIGENCIA_MS = 10 * MIN
let ultimaCargaClima = 0
let cargandoClima: Promise<void> | null = null

function refrescarClima(): Promise<void> {
  cargandoClima ??= traerClimaReal()
    .then(c => {
      if (c) fijarClimaReal(c)
      ultimaCargaClima = Date.now()
    })
    .finally(() => {
      cargandoClima = null
    })
  return cargandoClima
}

if (typeof window !== 'undefined') {
  const guardado = climaGuardado(CLIMA_VIGENCIA_MS)
  if (guardado) fijarClimaReal(guardado)
  refrescarClima()
}

/** Las rutas que enseñan el clima o dependen de él esperan a que llegue (un rato, no para siempre). */
function usaElClima(ruta: string): boolean {
  return ruta === 'clima' || ruta === 'agua/balance' || ruta.startsWith('alertas') || ruta in RUTAS_IA
}

async function climaListo(): Promise<void> {
  if (climaReal() && Date.now() - ultimaCargaClima < CLIMA_VIGENCIA_MS) return
  const carga = refrescarClima()
  // Con un clima ya en la mano se refresca por detrás. Sin él se espera
  // hasta 8 s; si no llega, la tarjeta del clima dice que no se pudo
  // consultar (nunca se enseña otra semana como si fuera esta).
  if (climaReal()) return
  await Promise.race([carga, new Promise(r => setTimeout(r, 8000))])
}

/** Sin el pronóstico de hoy, estas rutas contestan que no se pudo, como el backend sin clima. */
const SIN_CLIMA = ['clima', 'agua/balance']

// --- La IA real ---

type TipoIA = 'chat' | 'consejo' | 'analisis' | 'umbral' | 'agente' | 'foto'

const RUTAS_IA: Record<string, { tipo: TipoIA; metodo: 'GET' | 'POST' }> = {
  chat: { tipo: 'chat', metodo: 'POST' },
  'ai/consejo': { tipo: 'consejo', metodo: 'GET' },
  'ai/analisis': { tipo: 'analisis', metodo: 'GET' },
  'ai/umbral': { tipo: 'umbral', metodo: 'POST' },
  'agente/correr': { tipo: 'agente', metodo: 'POST' },
  'ai/foto': { tipo: 'foto', metodo: 'POST' },
}

/** Los consejos de cada pantalla se guardan un rato mientras el cultivo no cambie. */
const consejosGuardados = new Map<string, { cuando: number; consejo: string }>()
let analisisGuardado: { cuando: number; datos: object } | null = null
const CONSEJO_VIGENCIA_MS = 10 * MIN
const ANALISIS_VIGENCIA_MS = 15 * MIN

/** Un escenario o empezar de nuevo cambia el cultivo: el análisis guardado ya no vale. */
function olvidarLoDeLaIA(): void {
  consejosGuardados.clear()
  analisisGuardado = null
}

/** Lo que cambia el consejo: si riega, el modo, el sensor, la lluvia y la humedad de 3 en 3. */
function huellaDelEstado(e: Estado, ahora: number): string {
  const p = e.parcelas[0]
  return [e.bomba, e.auto, sensorMudo(e), lloviendo(e, ahora), Math.round(humedadActual(e) / 3), e.umbral, p?.cultivo, p?.etapa].join('|')
}

function json(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-IonDroplet-Demo': '1' },
  })
}

/** Lo que ve la persona si la IA no contestó ni al segundo intento. */
const NO_CONTESTO: Record<TipoIA, string> = {
  chat: 'No pude responder en este momento. Intenta de nuevo en unos segundos.',
  consejo: 'La IA no pudo opinar en este momento.',
  analisis: 'No se pudo armar el análisis en este momento.',
  umbral: 'No pude proponer un punto de riego en este momento. Intenta de nuevo.',
  agente: 'El agente no pudo revisar en este momento.',
  foto: 'No se pudieron revisar las fotos en este momento. Tus fotos siguen aquí: intenta de nuevo.',
}

/**
 * Un corte de la red o un error pasajero del servidor se reintenta una vez,
 * sin que la persona lo note. La foto no: tarda casi medio minuto y el
 * reintento la haría esperar el doble.
 */
async function preguntarConReintento(tipo: TipoIA, cuerpo: object, signal?: AbortSignal | null): Promise<RespuestaIA> {
  const r = await preguntarALaIA(cuerpo, signal)
  const pasajero = !r.ok && (r.status === 0 || r.status === 502)
  if (!pasajero || tipo === 'foto') return r
  await esperar(800, signal)
  return preguntarALaIA(cuerpo, signal)
}

/**
 * Le pregunta a la IA real y devuelve la respuesta para la app. Si la IA no
 * contesta, devuelve el error, como el backend: nunca un texto armado en su
 * lugar. null solo cuando la petición no le toca a la IA (pregunta vacía,
 * agente apagado) y la contesta la simulación con su error de siempre.
 */
async function conIA(
  tipo: TipoIA,
  e: Estado,
  consulta: URLSearchParams,
  cuerpo: Record<string, unknown>,
  ahora: number,
  signal?: AbortSignal | null
): Promise<Response | null> {
  avanzar(e, ahora)
  sincronizarAlertasDelClima(e, ahora)
  const contexto = contextoDelSistema(e, ahora)
  let r: RespuestaIA

  switch (tipo) {
    case 'consejo': {
      const pantalla = String(consulta.get('pantalla') ?? 'inicio')
      const clave = `${pantalla}|${huellaDelEstado(e, ahora)}`
      const guardado = consejosGuardados.get(clave)
      if (guardado && ahora - guardado.cuando < CONSEJO_VIGENCIA_MS) {
        return json({ consejo: guardado.consejo, cuando: new Date(guardado.cuando).toISOString(), deCache: true })
      }
      r = await preguntarConReintento(tipo, { tipo, contexto, pantalla }, signal)
      if (!r.ok) break
      const consejo = (r.datos as { consejo: string }).consejo
      consejosGuardados.set(clave, { cuando: ahora, consejo })
      return json({ consejo, cuando: new Date(ahora).toISOString() })
    }
    case 'chat': {
      if (typeof cuerpo.pregunta !== 'string' || cuerpo.pregunta.trim() === '') return null
      r = await preguntarConReintento(tipo, { tipo, contexto, pregunta: cuerpo.pregunta, historial: cuerpo.historial ?? [] }, signal)
      if (r.ok) return json(r.datos)
      break
    }
    case 'analisis': {
      if (analisisGuardado && ahora - analisisGuardado.cuando < ANALISIS_VIGENCIA_MS && !consulta.get('refrescar')) {
        return json({ ...analisisGuardado.datos, deCache: true })
      }
      const ind = indicadores(e, ahora)
      r = await preguntarConReintento(tipo, { tipo, contexto, indicadores: JSON.stringify(ind, null, 2) }, signal)
      if (!r.ok) break
      const datos = { analisis: r.datos, indicadores: ind, cuando: new Date(ahora).toISOString() }
      analisisGuardado = { cuando: ahora, datos }
      return json(datos)
    }
    case 'umbral':
      r = await preguntarConReintento(tipo, { tipo, contexto }, signal)
      if (r.ok) return json(r.datos)
      break
    case 'agente': {
      if (!e.agenteHabilitado) return null
      const p = e.parcelas.find(x => x.id === 1) ?? e.parcelas[0]
      r = await preguntarConReintento(
        tipo,
        {
          tipo,
          contexto,
          indicadores: JSON.stringify(indicadores(e, ahora), null, 2),
          puntoActual: e.umbral,
          puntoDeLaEtapa: puntoIdeal(p.cultivo, p.etapa),
        },
        signal
      )
      if (!r.ok) break
      const d = r.datos as { decision: 'mantener' | 'mover'; nuevo_punto: number | null; justificacion: string; confianza: number | null }
      const decision = aplicarDecisionDelAgente(e, Date.now(), {
        herramienta: d.decision === 'mover' ? 'actualizar_umbral_riego' : 'mantener_umbral',
        valor: d.nuevo_punto ?? e.umbral,
        justificacion: d.justificacion || 'Sin justificación.',
        confianza: d.confianza,
      })
      guardar()
      return json({ corrio: true, hechos: [{ herramienta: decision.herramienta }] })
    }
    case 'foto': {
      const parcelaId = Number.isInteger(cuerpo.parcelaId) ? (cuerpo.parcelaId as number) : null
      r = await preguntarConReintento(
        tipo,
        {
          tipo,
          contexto: contextoDeFoto(e, parcelaId, ahora) ?? '',
          fotos: cuerpo.fotos,
          parte: cuerpo.parte,
          plantaDeclarada: cuerpo.plantaDeclarada,
          nota: cuerpo.nota,
          catalogo: cuerpo.catalogo,
        },
        signal
      )
      if (r.ok) return json(r.datos)
      break
    }
  }

  if (r.ok) return null
  // Lo que la persona puede corregir (una foto pesada, demasiadas preguntas
  // seguidas) se le dice tal cual; lo demás, con palabras sencillas.
  const suyo = r.status === 400 || r.status === 413 || r.status === 422 || r.status === 429
  // 502 y no 503: con 503 las pantallas dirían "no está configurado en esta computadora".
  return json({ error: suyo ? r.error : NO_CONTESTO[tipo] }, suyo ? r.status : 502)
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

  if (usaElClima(ruta)) await climaListo()
  if (SIN_CLIMA.includes(ruta) && !climaReal()) return json({ error: 'No se pudo consultar el clima.' }, 502)

  const ia = RUTAS_IA[ruta]
  if (ia && ia.metodo === metodo) {
    const ahora = Date.now()
    const respuesta = await conIA(ia.tipo, cargar(ahora), url.searchParams, cuerpo, ahora, init.signal)
    if (respuesta) {
      programarGuardado()
      return respuesta
    }
  }

  await esperar(demora(ruta), init.signal)

  const ahora = Date.now()
  const { status, cuerpo: salida } = responder(cargar(ahora), metodo, ruta, url.searchParams, cuerpo, ahora)
  programarGuardado()
  return new Response(JSON.stringify(salida), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-IonDroplet-Demo': '1' },
  })
}
