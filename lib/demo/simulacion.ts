// El sistema de riego simulado de la demostración.
//
// POR QUÉ EXISTE: la app publicada en internet la abre cualquiera. Si hablara
// con la computadora del riego, cualquiera podría prender la bomba. En modo
// demostración nada sale del navegador: este modelo se inventa la humedad,
// riega cuando baja del punto de riego y lleva la bitácora. Cada visita tiene
// su propio sistema y lo que haga no le llega a nadie más.
//
// El modelo es sencillo a propósito: la tierra se seca más por la tarde que de
// noche, el riego la sube y el automático obedece el punto de riego igual que
// el backend. No pretende predecir un suelo real.
//
// Sin React ni navegador: se prueba con node --test.

import { etapaPorId } from '../cultivos.ts'

export const MIN = 60_000
export const HORA = 60 * MIN
export const DIA = 24 * HORA

export const DIAS_DE_HISTORIA = 30
const PASO_HISTORIA = 15 * MIN
/** Mientras alguien mira, se guarda una lectura por minuto. */
const PASO_VIVO = MIN
/** Riegos del pasado: el goteo sube medio punto por minuto. */
const SUBE_POR_MIN_HISTORIA = 0.5
/**
 * Igual que el backend real (server.js: `humedad < limite`), el automático
 * apaga la bomba en cuanto la lectura pasa el punto de riego: no hay margen.
 * En la historia la lectura del sensor va un poco atrasada respecto al agua,
 * así que cuando por fin pasa el punto la tierra queda de 2 a 4 puntos arriba.
 */
const ATRASO_MIN = 2
const ATRASO_VAR = 2
/** En vivo sube rápido, para que en la demostración un riego se vea en segundos. */
export const SUBE_POR_SEG_VIVO = 0.3
export const TOPE_HUMEDAD = 88
/** Mientras llueve en la demostración: milímetros por hora y cuánto sube la tierra. */
export const LLUVIA_MM_HORA = 4.6
const SUBE_POR_SEG_LLUVIA = 0.06
export const PISO_HUMEDAD = 8
/** Un riego a mano se corta solo a los 20 minutos, como el freno del backend. */
export const RIEGO_MANUAL_MAXIMO_MS = 20 * MIN

export const VERSION_ESTADO = 1

export type Origen = 'usuario' | 'ia' | 'umbral' | 'sistema'

export interface Lectura {
  t: number
  h: number
}

export interface Registro {
  id: number
  tipo: string
  detalle: string
  origen: Origen
  parcela_id: number
  t: number
  duracion_seg: number | null
}

export interface ParcelaDemo {
  id: number
  nombre: string
  cultivo: string
  num_hileras: number | null
  tipo_sistema: string | null
  hum_min: number
  hum_max: number
  device_id: string | null
  creado: string
  etapa: string | null
  area_ha: number | null
  ubicacion_fuente: string | null
  ubicacion_fecha: string | null
  caudal_lpm: number | null
}

export interface AlertaDemo {
  id: number
  parcela_id: number | null
  regla: string
  clave: string
  severidad: 'critica' | 'atencion' | 'informativa'
  titulo: string
  detalle: string
  dato: string
  accion: string
  estado: 'nueva' | 'leida' | 'atendida' | 'descartada' | 'resuelta'
  creada: string
  atendida_en: string | null
  atendida_por: string | null
}

export interface NutrienteDemo {
  nutriente: string
  cantidad: number | null
  unidad: string | null
}

export interface FertiDemo {
  id: number
  parcela_id: number
  aplicado: string
  duracion_min: number | null
  volumen_litros: number | null
  ec_ds_m: number | null
  ph: number | null
  etapa: string | null
  operador: string | null
  notas: string | null
  nutrientes: NutrienteDemo[]
}

export interface DecisionDemo {
  id: number
  parcela_id: number
  cuando: string
  herramienta: 'actualizar_umbral_riego' | 'mantener_umbral'
  entrada: null
  justificacion: string
  confianza: number | null
  valor_antes: number | null
  valor_despues: number | null
  aplicada: boolean
  acotada: boolean
  revertida_en: string | null
  revertida_por: string | null
}

export interface Estado {
  version: number
  /** Hasta dónde ya se simuló. */
  t: number
  /** Humedad de cada cultivo, por id. */
  h: Record<number, number>
  auto: boolean
  bomba: 0 | 1
  riego: { desde: number; origen: Origen; idRegistro: number } | null
  umbral: number
  ion: { encendida: boolean; desde: number }
  lecturas: Record<number, Lectura[]>
  ultimaGuardada: number
  registros: Registro[]
  sigId: number
  parcelas: ParcelaDemo[]
  alertas: AlertaDemo[]
  fertirriego: FertiDemo[]
  decisiones: DecisionDemo[]
  agenteHabilitado: boolean
  /**
   * Desde cuándo el sensor no manda lecturas (el escenario "desconectar el
   * sensor"). Mientras tanto la tierra se sigue secando, pero nadie lo mide y
   * el automático no decide. Es opcional para no invalidar visitas guardadas.
   */
  sensorMudoDesde?: number | null
  /** Hasta cuándo llueve (el escenario "Que llueva"). Opcional por lo mismo. */
  lluviaHasta?: number | null
}

// --- Utilidades ---

/** El formato de fecha del backend: SQLite en UTC, "YYYY-MM-DD HH:MM:SS". */
export function sqlTs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ')
}

export function deSqlTs(ts: string): number {
  return new Date(ts.replace(' ', 'T') + 'Z').getTime()
}

/** Números al azar que salen iguales con la misma semilla. */
export function azar(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function redondear(n: number, decimales = 1): number {
  const f = 10 ** decimales
  return Math.round(n * f) / f
}

/** "18 segundos", "1 minuto", "1 h 5 min": como lo escribe el backend. */
export function textoDuracion(segundos: number): string {
  if (segundos < 60) return `${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** Cuántos puntos de humedad pierde la tierra en una hora. */
export function secadoPorHora(t: number, cultivo: string): number {
  const hora = new Date(t).getHours()
  const base =
    hora >= 11 && hora < 18 ? 1.0
      : hora >= 7 && hora < 11 ? 0.55
        : hora >= 18 && hora < 21 ? 0.45
          : 0.2
  return base * (cultivo === 'chile' ? 1.35 : 1)
}

/** El punto de riego que el agente busca para cada etapa del nogal. */
const PUNTO_POR_ETAPA: Record<string, number> = {
  establecimiento: 50,
  brotacion: 45,
  floracion: 55,
  crecimiento_nuez: 55,
  llenado_almendra: 58,
  madurez_cosecha: 40,
  postcosecha: 38,
  reposo_invernal: 30,
}

/** Para los demás cultivos se decide por fase. */
const PUNTO_POR_FASE: Record<string, number> = {
  siembra: 55,
  crecimiento: 48,
  floracion: 55,
  fruto: 55,
  cosecha: 42,
  descanso: 32,
}

export function puntoIdeal(cultivo: string, etapa: string | null): number {
  if (etapa && PUNTO_POR_ETAPA[etapa] !== undefined && cultivo === 'nogal') return PUNTO_POR_ETAPA[etapa]
  const fase = etapaPorId(etapa, cultivo)?.fase
  return fase ? PUNTO_POR_FASE[fase] ?? 45 : 45
}

/** El coeficiente del cultivo (Kc) aproximado por etapa. */
const KC_POR_ETAPA: Record<string, number> = {
  establecimiento: 0.5,
  brotacion: 0.75,
  floracion: 0.95,
  crecimiento_nuez: 1.1,
  llenado_almendra: 1.15,
  madurez_cosecha: 0.85,
  postcosecha: 0.6,
  reposo_invernal: 0.25,
}

export function kcDe(cultivo: string, etapa: string | null): number {
  if (etapa && KC_POR_ETAPA[etapa] !== undefined) return KC_POR_ETAPA[etapa]
  const fase = etapaPorId(etapa, cultivo)?.fase
  const porFase: Record<string, number> = {
    siembra: 0.5, crecimiento: 0.8, floracion: 1.05, fruto: 1.05, cosecha: 0.85, descanso: 0.4,
  }
  return fase ? porFase[fase] ?? 0.9 : 0.9
}

// --- Bitácora ---

export function registrar(e: Estado, r: Omit<Registro, 'id'>): number {
  const id = e.sigId++
  e.registros.push({ id, ...r })
  return id
}

function cerrarRiego(e: Estado, fin: number): void {
  if (!e.riego) return
  const segundos = Math.max(1, Math.round((fin - e.riego.desde) / 1000))
  const fila = e.registros.find(r => r.id === e.riego!.idRegistro)
  if (fila) {
    fila.detalle = `Riego de ${textoDuracion(segundos)}`
    fila.duracion_seg = segundos
  }
  // La ionización la liga el aparato a la bomba: queda registrada junto.
  registrar(e, {
    tipo: 'ionizacion',
    detalle: `Ionización de ${textoDuracion(segundos)}`,
    origen: e.riego.origen,
    parcela_id: 1,
    t: e.riego.desde,
    duracion_seg: segundos,
  })
  e.riego = null
}

export function encenderBomba(e: Estado, t: number, origen: Origen): void {
  if (e.bomba === 1) return
  e.bomba = 1
  const id = registrar(e, {
    tipo: 'riego', detalle: 'Empezó a regar', origen, parcela_id: 1, t, duracion_seg: null,
  })
  e.riego = { desde: t, origen, idRegistro: id }
}

export function apagarBomba(e: Estado, t: number): void {
  if (e.bomba === 0) return
  e.bomba = 0
  cerrarRiego(e, t)
}

export function cambiarPuntoDeRiego(e: Estado, valor: number, origen: Origen, t: number, detalle?: string): void {
  e.umbral = valor
  const p = e.parcelas.find(x => x.id === 1)
  if (p) p.hum_min = valor
  registrar(e, {
    tipo: 'umbral',
    detalle: detalle ?? `Cambió el punto de riego a ${valor}%`,
    origen,
    parcela_id: 1,
    t,
    duracion_seg: null,
  })
}

// --- El estado inicial: 30 días de historia ---

/**
 * Las decisiones del agente en el pasado. Cuentan una historia que cuadra
 * con la etapa: al abrir el ruezno el nogal se riega menos para cosechar.
 */
const DECISIONES_PASADAS: Array<{
  hace: number
  antes: number
  despues: number | null
  confianza: number
  justificacion: string
}> = [
  {
    hace: 13 * DIA + 5 * HORA,
    antes: 48,
    despues: 45,
    confianza: 78,
    justificacion:
      'El llenado de almendra terminó y el cultivo pide menos agua: la evapotranspiración bajó de 6.1 a 4.9 mm por día. Bajo el punto 3 puntos para no regar de más.',
  },
  {
    hace: 9 * DIA + 6 * HORA,
    antes: 45,
    despues: 42,
    confianza: 82,
    justificacion:
      'Pasó a Madurez y cosecha: abre el ruezno y conviene que la tierra no esté tan húmeda para poder cosechar. Con el punto en 45% la tierra quedaba más húmeda de lo que pide la etapa.',
  },
  {
    hace: 5 * DIA + 7 * HORA,
    antes: 42,
    despues: 40,
    confianza: 74,
    justificacion:
      'Esta semana se esperan unos 16 mm de lluvia contra 18 mm que pide el cultivo. Con la lluvia casi cubriendo la demanda, 40% basta para la etapa.',
  },
  {
    hace: 2 * DIA + 6 * HORA,
    antes: 40,
    despues: null,
    confianza: 80,
    justificacion:
      'La humedad se mantuvo justo arriba del punto y nunca pasó más de una hora abajo de él. El punto actual está funcionando: lo dejo igual.',
  },
]

function puntoEn(t: number, ahora: number): number {
  let valor = 48
  for (const d of [...DECISIONES_PASADAS].sort((a, b) => b.hace - a.hace)) {
    if (t >= ahora - d.hace && d.despues !== null) valor = d.despues
  }
  return valor
}

/** Los cultivos de la demostración. Nombres y lugar de ejemplo. */
function parcelasIniciales(ahora: number): ParcelaDemo[] {
  return [
    {
      id: 1,
      nombre: 'Huerta Norte',
      cultivo: 'nogal',
      num_hileras: 12,
      tipo_sistema: 'goteo',
      hum_min: 40,
      hum_max: 80,
      device_id: 'ESP-DEMO-1',
      creado: sqlTs(ahora - 120 * DIA),
      etapa: 'madurez_cosecha',
      area_ha: 1.2,
      ubicacion_fuente: 'telefono',
      ubicacion_fecha: sqlTs(ahora - 60 * DIA),
      caudal_lpm: 900,
    },
    {
      id: 2,
      nombre: 'Chile de la orilla',
      cultivo: 'chile',
      num_hileras: 8,
      tipo_sistema: 'goteo',
      hum_min: 45,
      hum_max: 80,
      device_id: 'ESP-DEMO-2',
      creado: sqlTs(ahora - 90 * DIA),
      etapa: 'cosecha_escalonada',
      area_ha: 0.4,
      ubicacion_fuente: 'telefono',
      ubicacion_fecha: sqlTs(ahora - 60 * DIA),
      caudal_lpm: 300,
    },
  ]
}

function alertasIniciales(ahora: number): AlertaDemo[] {
  const base = { parcela_id: 1, atendida_en: null, atendida_por: null }
  return [
    {
      ...base,
      id: 4,
      regla: 'lluvia_proxima',
      clave: 'lluvia_proxima',
      severidad: 'informativa',
      titulo: 'Viene lluvia esta semana',
      detalle: 'El pronóstico trae agua en los próximos días. Si llueve, el riego automático no tendrá que trabajar.',
      dato: 'Hasta 40% de probabilidad y unos 16 mm en la semana.',
      accion: 'No hace falta hacer nada: el punto de riego ya lo toma en cuenta.',
      estado: 'nueva',
      creada: sqlTs(ahora - 3 * HORA),
    },
    {
      ...base,
      id: 3,
      regla: 'deficit_agua',
      clave: 'deficit_agua',
      severidad: 'atencion',
      titulo: 'Tres días secos antes de la lluvia',
      detalle: 'En los próximos tres días el cultivo va a pedir más agua de la que va a llover.',
      dato: 'Pide 11 mm en tres días y no se espera lluvia en ellos.',
      accion: 'El riego automático lo cubre. Revisa que los goteros no estén tapados.',
      estado: 'leida',
      creada: sqlTs(ahora - 20 * HORA),
    },
    {
      ...base,
      id: 2,
      regla: 'humedad_baja_etapa',
      clave: 'humedad_baja_etapa',
      severidad: 'atencion',
      titulo: 'La humedad bajó de lo que pide la etapa',
      detalle: 'Por la tarde la tierra se secó más rápido de lo normal.',
      dato: '37% contra 40% que pide Madurez y cosecha.',
      accion: 'El riego automático ya lo atendió.',
      estado: 'resuelta',
      creada: sqlTs(ahora - 4 * DIA - 3 * HORA),
    },
    {
      id: 1,
      parcela_id: 1,
      regla: 'sensor_mudo',
      clave: 'sensor_mudo',
      severidad: 'critica',
      titulo: 'El sensor lleva rato sin reportar',
      detalle: 'La última lectura de Huerta Norte es de hace 2 horas. Mientras tanto el riego automático no puede decidir solo.',
      dato: 'Última lectura: 47% hace 2 horas.',
      accion: 'Ve a la parcela y revisa el cable, la pila y la conexión del aparato.',
      estado: 'atendida',
      creada: sqlTs(ahora - 11 * DIA - 6 * HORA),
      atendida_en: sqlTs(ahora - 11 * DIA - 5 * HORA),
      atendida_por: 'Encargado',
    },
  ]
}

function fertirriegoInicial(ahora: number): FertiDemo[] {
  return [
    {
      id: 3,
      parcela_id: 1,
      aplicado: sqlTs(ahora - 8 * DIA - 4 * HORA),
      duracion_min: 40,
      volumen_litros: 1800,
      ec_ds_m: 1.6,
      ph: 6.5,
      etapa: 'madurez_cosecha',
      operador: 'Encargado',
      notas: 'Potasio para el llenado final y la apertura del ruezno.',
      nutrientes: [
        { nutriente: 'K', cantidad: 10, unidad: 'kg' },
        { nutriente: 'Zn', cantidad: 1.5, unidad: 'kg' },
      ],
    },
    {
      id: 2,
      parcela_id: 1,
      aplicado: sqlTs(ahora - 21 * DIA - 5 * HORA),
      duracion_min: 45,
      volumen_litros: 2000,
      ec_ds_m: 1.8,
      ph: 6.4,
      etapa: 'llenado_almendra',
      operador: 'Encargado',
      notas: 'Última de nitrógeno del ciclo.',
      nutrientes: [
        { nutriente: 'N', cantidad: 12, unidad: 'kg' },
        { nutriente: 'K', cantidad: 8, unidad: 'kg' },
      ],
    },
    {
      id: 1,
      parcela_id: 1,
      aplicado: sqlTs(ahora - 48 * DIA - 3 * HORA),
      duracion_min: 50,
      volumen_litros: 2200,
      ec_ds_m: 1.9,
      ph: 6.3,
      etapa: 'llenado_almendra',
      operador: 'Encargado',
      notas: null,
      nutrientes: [
        { nutriente: 'N', cantidad: 15, unidad: 'kg' },
        { nutriente: 'P', cantidad: 5, unidad: 'kg' },
        { nutriente: 'Zn', cantidad: 2, unidad: 'kg' },
      ],
    },
  ]
}

export function crearEstado(ahora: number, semilla = 20261001): Estado {
  const r = azar(semilla)
  const parcelas = parcelasIniciales(ahora)
  const e: Estado = {
    version: VERSION_ESTADO,
    t: ahora,
    h: {},
    auto: true,
    bomba: 0,
    riego: null,
    umbral: puntoEn(ahora, ahora),
    ion: { encendida: false, desde: ahora - 2 * DIA },
    lecturas: {},
    ultimaGuardada: ahora,
    registros: [],
    sigId: 1,
    parcelas,
    alertas: alertasIniciales(ahora),
    fertirriego: fertirriegoInicial(ahora),
    decisiones: [],
    agenteHabilitado: true,
  }

  // Un aguacero hace 17 días: se nota en la gráfica de 30 días.
  const lluvia = ahora - 17 * DIA + 4 * HORA
  const inicio = ahora - DIAS_DE_HISTORIA * DIA
  // Lo que pasó antes de empezar a riego y a cambios va en orden de tiempo:
  // se juntan y se registran ordenados al final.
  const eventos: Array<Omit<Registro, 'id'>> = []

  for (const p of parcelas) {
    let h = p.id === 1 ? 58 : 52
    const lista: Lectura[] = []
    for (let t = inicio; t <= ahora; t += PASO_HISTORIA) {
      h -= secadoPorHora(t, p.cultivo) * (PASO_HISTORIA / HORA) + (r() - 0.5) * 0.3
      if (t >= lluvia && t < lluvia + 2 * HORA) h += 1.6
      const punto = p.id === 1 ? puntoEn(t, ahora) : p.hum_min
      if (h < punto) {
        const meta = Math.min(TOPE_HUMEDAD, punto + ATRASO_MIN + r() * ATRASO_VAR)
        const minutos = Math.round((meta - h) / SUBE_POR_MIN_HISTORIA)
        const segundos = minutos * 60
        eventos.push({
          tipo: 'riego', detalle: `Riego de ${textoDuracion(segundos)}`, origen: 'umbral',
          parcela_id: p.id, t, duracion_seg: segundos,
        })
        eventos.push({
          tipo: 'ionizacion', detalle: `Ionización de ${textoDuracion(segundos)}`, origen: 'umbral',
          parcela_id: p.id, t, duracion_seg: segundos,
        })
        // La lectura de antes del riego y la de después, al terminar.
        lista.push({ t, h: redondear(h) })
        h = meta
        lista.push({ t: t + segundos * 1000, h: redondear(h) })
        t += Math.ceil((segundos * 1000) / PASO_HISTORIA) * PASO_HISTORIA - PASO_HISTORIA
        continue
      }
      h = Math.min(TOPE_HUMEDAD, Math.max(PISO_HUMEDAD, h))
      lista.push({ t, h: redondear(h) })
    }
    e.h[p.id] = h
    e.lecturas[p.id] = lista
  }

  // Las decisiones del agente, en la bitácora y en su lista.
  for (const d of DECISIONES_PASADAS) {
    const cuando = ahora - d.hace
    const cambio = d.despues !== null
    e.decisiones.push({
      id: 0,
      parcela_id: 1,
      cuando: sqlTs(cuando),
      herramienta: cambio ? 'actualizar_umbral_riego' : 'mantener_umbral',
      entrada: null,
      justificacion: d.justificacion,
      confianza: d.confianza,
      valor_antes: d.antes,
      valor_despues: cambio ? d.despues : d.antes,
      aplicada: cambio,
      acotada: false,
      revertida_en: null,
      revertida_por: null,
    })
    eventos.push({
      tipo: cambio ? 'umbral' : 'agente',
      detalle: cambio
        ? `El agente movió el punto de riego de ${d.antes}% a ${d.despues}%`
        : `Mantuvo el punto en ${d.antes}%: ${d.justificacion}`,
      origen: 'ia',
      parcela_id: 1,
      t: cuando,
      duracion_seg: null,
    })
  }
  e.decisiones.sort((a, b) => deSqlTs(b.cuando) - deSqlTs(a.cuando))
  e.decisiones.forEach((d, i) => (d.id = e.decisiones.length - i))

  eventos.sort((a, b) => a.t - b.t)
  for (const ev of eventos) registrar(e, ev)

  // Si el último riego del cultivo principal sigue abierto, se da por cerrado:
  // la visita empieza con la bomba apagada.
  e.h[1] = Math.max(e.h[1], e.umbral + 1)
  return e
}

// --- El tiempo corre ---

/** Lleva la simulación hasta `ahora`. Llamarla seguido es barato. */
export function avanzar(e: Estado, ahora: number): void {
  let t = e.t
  while (t < ahora) {
    const dt = Math.min(e.bomba ? 5000 : 60_000, ahora - t)
    paso(e, t, dt)
    t += dt
  }
  e.t = Math.max(e.t, ahora)
}

function paso(e: Estado, t: number, dt: number): void {
  const fin = t + dt
  const segundos = dt / 1000
  const principal = e.parcelas.find(p => p.id === 1)

  // El cultivo principal: el que tiene la bomba que se ve en pantalla.
  const llueve = lloviendo(e, t)
  if (e.bomba) e.h[1] = Math.min(TOPE_HUMEDAD, e.h[1] + SUBE_POR_SEG_VIVO * segundos)
  else if (llueve) e.h[1] = Math.min(TOPE_HUMEDAD, e.h[1] + SUBE_POR_SEG_LLUVIA * segundos)
  else e.h[1] = Math.max(PISO_HUMEDAD, e.h[1] - secadoPorHora(t, principal?.cultivo ?? 'nogal') * (segundos / 3600))

  // Sin lecturas el automático no sabe cómo está la tierra: no decide.
  const mudo = sensorMudo(e)
  if (e.auto && !mudo) {
    if (!e.bomba && e.h[1] < e.umbral) encenderBomba(e, fin, 'umbral')
    else if (e.bomba && e.h[1] >= e.umbral) apagarBomba(e, fin)
  } else if (e.bomba && e.riego && fin - e.riego.desde >= RIEGO_MANUAL_MAXIMO_MS) {
    apagarBomba(e, fin)
    registrar(e, {
      tipo: 'freno',
      detalle: 'La bomba se apagó sola: el riego a mano llegó al tope de 20 minutos',
      origen: 'sistema',
      parcela_id: 1,
      t: fin,
      duracion_seg: null,
    })
  }

  // Los demás cultivos se riegan solos, de golpe, como en la historia.
  for (const p of e.parcelas) {
    if (p.id === 1) continue
    if (e.h[p.id] === undefined) e.h[p.id] = 50
    e.h[p.id] = Math.max(PISO_HUMEDAD, e.h[p.id] - secadoPorHora(t, p.cultivo) * (segundos / 3600))
    if (e.h[p.id] < p.hum_min) e.h[p.id] = Math.min(TOPE_HUMEDAD, p.hum_min + ATRASO_MIN + ATRASO_VAR / 2)
  }

  if (fin - e.ultimaGuardada >= PASO_VIVO) {
    for (const p of e.parcelas) {
      if (p.id === 1 && mudo) continue
      const lista = (e.lecturas[p.id] ??= [])
      lista.push({ t: fin, h: redondear(e.h[p.id]) })
    }
    e.ultimaGuardada = fin
    recortarHistoria(e, fin)
  }
}

function recortarHistoria(e: Estado, ahora: number): void {
  const limite = ahora - DIAS_DE_HISTORIA * DIA
  for (const id of Object.keys(e.lecturas)) {
    const lista = e.lecturas[Number(id)]
    if (lista.length > 0 && lista[0].t < limite) {
      e.lecturas[Number(id)] = lista.filter(l => l.t >= limite)
    }
  }
}

/** ¿Está lloviendo en la demostración en este momento? */
export function lloviendo(e: Estado, t: number): boolean {
  return typeof e.lluviaHasta === 'number' && t < e.lluviaHasta
}

/** ¿El sensor del cultivo principal dejó de mandar lecturas? */
export function sensorMudo(e: Estado): boolean {
  return e.sensorMudoDesde !== undefined && e.sensorMudoDesde !== null
}

/** La última lectura que llegó del cultivo principal. */
export function ultimaLectura(e: Estado): Lectura | null {
  const lista = e.lecturas[1] ?? []
  return lista.length > 0 ? lista[lista.length - 1] : null
}

/** La humedad que marca el sensor ahora: entera, como la manda el ESP32. */
export function humedadActual(e: Estado, id = 1): number {
  return Math.round(e.h[id] ?? 0)
}

/** Una de cada N lecturas, como hace el backend: son lecturas, no promedios. */
export function aligerar<T>(lista: T[], max: number): T[] {
  if (lista.length <= max) return lista
  const paso = Math.ceil(lista.length / max)
  const salida = lista.filter((_, i) => i % paso === 0)
  if (salida[salida.length - 1] !== lista[lista.length - 1]) salida.push(lista[lista.length - 1])
  return salida
}

// --- El agente agrónomo de la demostración ---

export interface Pronostico {
  etcSemana: number
  lluviaSemana: number
}

/**
 * Decide el punto de riego con los mismos límites que el agente de verdad:
 * entre 10 y 90 y como mucho 5 puntos por vez. Busca el punto que pide la
 * etapa; si el pronóstico trae lluvia que cubre la demanda, se queda abajo.
 */
export function decidirAgente(e: Estado, ahora: number, pronostico: Pronostico): DecisionDemo {
  const p = e.parcelas.find(x => x.id === 1)!
  const ideal = puntoIdeal(p.cultivo, p.etapa)
  const nombreEtapa = etapaPorId(p.etapa, p.cultivo)?.nombre ?? 'sin etapa'
  const antes = e.umbral
  const diferencia = ideal - antes
  const paso = Math.max(-5, Math.min(5, diferencia))
  const acotada = Math.abs(diferencia) > 5
  const despues = Math.max(10, Math.min(90, antes + paso))
  const cambia = Math.abs(diferencia) >= 2

  const datos =
    `Etapa: ${nombreEtapa}. Esta semana el cultivo pide ${redondear(pronostico.etcSemana)} mm ` +
    `y se esperan ${redondear(pronostico.lluviaSemana)} mm de lluvia. La humedad ahora es ${humedadActual(e)}%.`
  const justificacion = cambia
    ? `${datos} Para esta etapa conviene un punto de ${ideal}%: lo ${paso > 0 ? 'subo' : 'bajo'} de ${antes}% a ${despues}%.`
    : `${datos} El punto de ${antes}% ya es el que pide la etapa: lo dejo igual.`

  const decision: DecisionDemo = {
    id: e.decisiones.reduce((m, d) => Math.max(m, d.id), 0) + 1,
    parcela_id: 1,
    cuando: sqlTs(ahora),
    herramienta: cambia ? 'actualizar_umbral_riego' : 'mantener_umbral',
    entrada: null,
    justificacion,
    confianza: cambia ? 76 : 82,
    valor_antes: antes,
    valor_despues: cambia ? despues : antes,
    aplicada: cambia,
    acotada: cambia && acotada,
    revertida_en: null,
    revertida_por: null,
  }
  e.decisiones.unshift(decision)
  if (cambia) {
    cambiarPuntoDeRiego(e, despues, 'ia', ahora, `El agente movió el punto de riego de ${antes}% a ${despues}%`)
  } else {
    registrar(e, {
      tipo: 'agente', detalle: `Mantuvo el punto en ${antes}%: ${justificacion}`, origen: 'ia',
      parcela_id: 1, t: ahora, duracion_seg: null,
    })
  }
  return decision
}
