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
// la IA no está disponible, contestan los textos de reserva de textos-ia.ts y
// cada uno dice que es de ejemplo.

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
  if (Date.now() - ultimaCargaClima < CLIMA_VIGENCIA_MS) return
  const carga = refrescarClima()
  // Con un clima ya en la mano se refresca por detrás. La primera vez se
  // espera hasta 4 s; si no llega, se usa el de ejemplo y la tarjeta lo dice.
  if (climaReal()) return
  await Promise.race([carga, new Promise(r => setTimeout(r, 4000))])
}

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

/** Errores que se le dicen tal cual a la persona; con los demás contesta la reserva. */
function seDiceTalCual(tipo: TipoIA, r: RespuestaIA): r is Extract<RespuestaIA, { ok: false }> {
  if (r.ok) return false
  if (tipo === 'consejo' || tipo === 'analisis') return false
  return r.status === 400 || r.status === 413 || r.status === 422 || r.status === 429
}

/**
 * Le pregunta a la IA real. Devuelve la respuesta para la app, o null si hay
 * que contestar con la reserva.
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
      r = await preguntarALaIA({ tipo, contexto, pantalla }, signal)
      if (!r.ok) break
      const consejo = (r.datos as { consejo: string }).consejo
      consejosGuardados.set(clave, { cuando: ahora, consejo })
      return json({ consejo, cuando: new Date(ahora).toISOString() })
    }
    case 'chat': {
      if (typeof cuerpo.pregunta !== 'string' || cuerpo.pregunta.trim() === '') return null
      r = await preguntarALaIA({ tipo, contexto, pregunta: cuerpo.pregunta, historial: cuerpo.historial ?? [] }, signal)
      if (r.ok) return json(r.datos)
      break
    }
    case 'analisis': {
      if (analisisGuardado && ahora - analisisGuardado.cuando < ANALISIS_VIGENCIA_MS && !consulta.get('refrescar')) {
        return json({ ...analisisGuardado.datos, deCache: true })
      }
      const ind = indicadores(e, ahora)
      r = await preguntarALaIA({ tipo, contexto, indicadores: JSON.stringify(ind, null, 2) }, signal)
      if (!r.ok) break
      const datos = { analisis: r.datos, indicadores: ind, cuando: new Date(ahora).toISOString() }
      analisisGuardado = { cuando: ahora, datos }
      return json(datos)
    }
    case 'umbral':
      r = await preguntarALaIA({ tipo, contexto }, signal)
      if (r.ok) return json(r.datos)
      break
    case 'agente': {
      if (!e.agenteHabilitado) return null
      const p = e.parcelas.find(x => x.id === 1) ?? e.parcelas[0]
      r = await preguntarALaIA(
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
      r = await preguntarALaIA(
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

  return seDiceTalCual(tipo, r) ? json({ error: r.error }, r.status) : null
}

/** A la respuesta de reserva se le pone delante que es de ejemplo: nunca se hace pasar por la IA. */
function marcarComoEjemplo(tipo: TipoIA, e: Estado, salida: unknown): void {
  if (!salida || typeof salida !== 'object') return
  const s = salida as Record<string, unknown>
  const aviso = 'la IA no está disponible en este momento'
  if (tipo === 'chat' && typeof s.respuesta === 'string') s.respuesta = `Respuesta de ejemplo (${aviso}). ${s.respuesta}`
  if (tipo === 'consejo' && typeof s.consejo === 'string') s.consejo = `Ejemplo, sin IA: ${s.consejo}`
  if (tipo === 'umbral' && typeof s.razon === 'string') s.razon = `Propuesta de ejemplo (${aviso}). ${s.razon}`
  if (tipo === 'analisis' && s.analisis && typeof s.analisis === 'object') {
    const a = s.analisis as Record<string, unknown>
    a.resumen = `Análisis de ejemplo (${aviso}). ${a.resumen ?? ''}`
  }
  if (tipo === 'agente' && s.corrio && e.decisiones[0]) {
    e.decisiones[0].justificacion = `Decisión por reglas (${aviso}). ${e.decisiones[0].justificacion}`
  }
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

  const ia = RUTAS_IA[ruta]
  const conLaIA = Boolean(ia && ia.metodo === metodo)
  if (conLaIA) {
    const ahora = Date.now()
    const respuesta = await conIA(ia.tipo, cargar(ahora), url.searchParams, cuerpo, ahora, init.signal)
    if (respuesta) {
      programarGuardado()
      return respuesta
    }
  }

  await esperar(demora(ruta), init.signal)

  const ahora = Date.now()
  const estadoActual = cargar(ahora)
  const { status, cuerpo: salida } = responder(estadoActual, metodo, ruta, url.searchParams, cuerpo, ahora)
  if (conLaIA && status === 200) marcarComoEjemplo(ia.tipo, estadoActual, salida)
  programarGuardado()
  return new Response(JSON.stringify(salida), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-IonDroplet-Demo': '1' },
  })
}
