// El clima de verdad para la demostración pública: el de la ciudad de
// Chihuahua, de Open-Meteo, al momento.
//
// Antes la demostración usaba una semana de otoño guardada y corrida a las
// fechas de hoy. Decía "el jueves llueve" aunque no lloviera, y eso es
// presentar como pronóstico un dato que no lo es. Ahora el cultivo sigue
// siendo simulado, pero el clima, los avisos y el pronóstico que lee la IA son
// los reales.
//
// Aquí solo hay funciones puras: las usan el servidor (que pide el clima y se
// lo pasa a la IA) y el navegador (que lo enseña). Se prueban con node --test.

/** Dónde está el cultivo de la demostración: la ciudad de Chihuahua. */
export const LUGAR_DEMO = {
  nombre: 'Chihuahua, Chih.',
  latitud: 28.6353,
  longitud: -106.0889,
  zona: 'America/Chihuahua',
} as const

/** Lo que se le pide a Open-Meteo: lo mismo que el backend, más las próximas 24 horas. */
export function urlOpenMeteo(): string {
  const { latitud, longitud, zona } = LUGAR_DEMO
  return (
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${latitud}&longitude=${longitud}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code,is_day' +
    '&hourly=temperature_2m,precipitation_probability,precipitation,weather_code' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code,et0_fao_evapotranspiration' +
    `&timezone=${encodeURIComponent(zona)}&forecast_days=7&forecast_hours=24`
  )
}

export interface AhoraReal {
  time: string
  temperature_2m: number
  relative_humidity_2m: number
  apparent_temperature?: number
  precipitation: number
  wind_speed_10m: number
  weather_code?: number
  is_day?: number
}

export interface DiasReales {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_sum: number[]
  precipitation_probability_max: number[]
  wind_speed_10m_max: number[]
  weather_code: number[]
  et0_fao_evapotranspiration: number[]
}

export interface HorasReales {
  time: string[]
  temperature_2m: number[]
  precipitation_probability: number[]
  precipitation: number[]
  weather_code: number[]
}

/** Lo que devuelve /api/demo/clima: la respuesta de Open-Meteo y cuándo se pidió. */
export interface ClimaReal {
  lugar: string
  latitud: number
  longitud: number
  /** Cuándo se le preguntó a Open-Meteo (ISO). */
  consultado: string
  current: AhoraReal
  hourly: HorasReales
  daily: DiasReales
}

const esLista = (v: unknown, largo: number) => Array.isArray(v) && v.length >= largo

/**
 * ¿Se puede usar esta respuesta? Open-Meteo a veces devuelve un error con
 * status 200 o listas cortadas. Mejor descartarla que enseñar huecos.
 */
export function climaValido(datos: unknown): datos is ClimaReal {
  if (!datos || typeof datos !== 'object') return false
  const d = datos as Partial<ClimaReal>
  if (!d.current || typeof d.current.temperature_2m !== 'number') return false
  const dias = d.daily
  if (!dias || !esLista(dias.time, 3)) return false
  const n = dias.time.length
  return (
    esLista(dias.temperature_2m_max, n) &&
    esLista(dias.temperature_2m_min, n) &&
    esLista(dias.precipitation_sum, n) &&
    esLista(dias.precipitation_probability_max, n) &&
    esLista(dias.wind_speed_10m_max, n) &&
    esLista(dias.et0_fao_evapotranspiration, n)
  )
}

// --- Avisos del pronóstico: las mismas reglas que server.js (avisosDelClima) ---

export interface AvisoDelClima {
  tipo: 'helada' | 'lluvia' | 'viento' | 'calor'
  nivel: 'peligro' | 'aviso'
  dia: string
  texto: string
}

const HELADA_PELIGRO = 0
const HELADA_AVISO = 3
const LLUVIA_MM = 5
const LLUVIA_PROBABILIDAD = 60
const VIENTO_FUERTE = 40
const CALOR_EXTREMO = 38

function nombreDelDia(fecha: string, i: number): string {
  if (i === 0) return 'hoy'
  if (i === 1) return 'mañana'
  return `el ${new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long' })}`
}

/** Nada de esto se inventa: sale de los números que devuelve el servicio de clima. */
export function avisosDelClima(d: DiasReales): AvisoDelClima[] {
  const avisos: AvisoDelClima[] = []
  for (let i = 0; i < d.time.length; i++) {
    const dia = nombreDelDia(d.time[i], i)
    const minima = d.temperature_2m_min[i]
    if (minima !== null && minima <= HELADA_PELIGRO) {
      avisos.push({ tipo: 'helada', nivel: 'peligro', dia: d.time[i], texto: `Va a helar ${dia}: la mínima baja a ${Math.round(minima)}°C.` })
    } else if (minima !== null && minima <= HELADA_AVISO) {
      avisos.push({ tipo: 'helada', nivel: 'aviso', dia: d.time[i], texto: `Puede helar ${dia}: la mínima queda en ${Math.round(minima)}°C.` })
    }

    const lluvia = d.precipitation_sum[i]
    const probabilidad = d.precipitation_probability_max[i]
    if ((lluvia !== null && lluvia >= LLUVIA_MM) || (probabilidad !== null && probabilidad >= LLUVIA_PROBABILIDAD)) {
      avisos.push({
        tipo: 'lluvia', nivel: 'aviso', dia: d.time[i],
        texto: `Se espera agua ${dia}: ${Math.round(probabilidad ?? 0)}% de probabilidad${lluvia ? `, como ${lluvia} mm` : ''}.`,
      })
    }

    const viento = d.wind_speed_10m_max[i]
    if (viento !== null && viento >= VIENTO_FUERTE) {
      avisos.push({ tipo: 'viento', nivel: 'aviso', dia: d.time[i], texto: `Viento fuerte ${dia}: hasta ${Math.round(viento)} km/h.` })
    }

    const maxima = d.temperature_2m_max[i]
    if (maxima !== null && maxima >= CALOR_EXTREMO) {
      avisos.push({ tipo: 'calor', nivel: 'aviso', dia: d.time[i], texto: `Calor fuerte ${dia}: hasta ${Math.round(maxima)}°C.` })
    }
  }
  const orden = { peligro: 0, aviso: 1 }
  return avisos.sort((a, b) => orden[a.nivel] - orden[b.nivel] || a.dia.localeCompare(b.dia)).slice(0, 5)
}

// --- Las próximas horas ---

export interface Hora {
  hora: string
  temperatura: number
  probabilidad: number
  lluvia_mm: number
  codigo: number | null
}

/**
 * Las próximas horas a partir de la hora de ahora en Chihuahua. Open-Meteo ya
 * las manda desde la hora en curso; si la respuesta tiene un rato, se brincan
 * las que ya pasaron.
 */
export function proximasHoras(h: HorasReales | undefined, ahoraLocal: string, cuantas = 12): Hora[] {
  if (!h || !Array.isArray(h.time)) return []
  const actual = ahoraLocal.slice(0, 13)
  const desde = Math.max(0, h.time.findIndex(t => t.slice(0, 13) >= actual))
  return h.time.slice(desde, desde + cuantas).map((t, k) => {
    const i = desde + k
    return {
      hora: t,
      temperatura: h.temperature_2m[i],
      probabilidad: h.precipitation_probability?.[i] ?? 0,
      lluvia_mm: h.precipitation?.[i] ?? 0,
      codigo: h.weather_code?.[i] ?? null,
    }
  })
}

/** "2026-10-06T21:30" en la hora de Chihuahua, para comparar con las horas de Open-Meteo. */
export function horaLocalDeChihuahua(ms: number): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: LUGAR_DEMO.zona, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(ms))
  const v = (t: string) => partes.find(p => p.type === t)?.value ?? '00'
  return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`
}

// --- El pronóstico en palabras, para la IA ---

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '?' : Math.round(n * 10) / 10)

/** El clima real en renglones: ahora, las próximas horas, 7 días y los avisos. */
export function pronosticoEnTexto(c: ClimaReal, ahora: number): string {
  const d = c.daily
  const partes = [`CLIMA REAL de ${c.lugar} (Open-Meteo, consultado ${new Date(c.consultado).toLocaleTimeString('es-MX', { timeZone: LUGAR_DEMO.zona, hour: '2-digit', minute: '2-digit' })}):`]
  const a = c.current
  partes.push(
    `Ahora: ${fmt(a.temperature_2m)}°C${a.apparent_temperature !== undefined ? ` (sensación ${fmt(a.apparent_temperature)}°C)` : ''}, humedad del aire ${fmt(a.relative_humidity_2m)}%, viento ${fmt(a.wind_speed_10m)} km/h, lluvia ${fmt(a.precipitation)} mm.`
  )

  const horas = proximasHoras(c.hourly, horaLocalDeChihuahua(ahora), 12)
  if (horas.length > 0) {
    partes.push(
      'Próximas horas: ' +
        horas.filter((_, i) => i % 3 === 0).map(h => `${h.hora.slice(11, 16)} ${fmt(h.temperatura)}°C, ${Math.round(h.probabilidad)}% de lluvia`).join('; ') +
        '.'
    )
  }

  partes.push('Pronóstico de 7 días:')
  d.time.forEach((dia, i) => {
    const nombre = new Date(dia + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })
    partes.push(
      `- ${nombre}: máx ${fmt(d.temperature_2m_max[i])}°C, mín ${fmt(d.temperature_2m_min[i])}°C, lluvia ${fmt(d.precipitation_sum[i])} mm (${fmt(d.precipitation_probability_max[i])}%), viento ${fmt(d.wind_speed_10m_max[i])} km/h, evapotranspiración ${fmt(d.et0_fao_evapotranspiration[i])} mm`
    )
  })
  const avisos = avisosDelClima(d)
  partes.push(avisos.length > 0 ? `Avisos del clima: ${avisos.map(x => x.texto).join(' ')}` : 'El pronóstico no trae helada, lluvia fuerte, viento fuerte ni calor extremo.')
  return partes.join('\n')
}

/** "martes, 6 de octubre, 21:30" en Chihuahua, para que la IA sepa qué día y qué hora es. */
export function fechaEnChihuahua(ms: number): string {
  return new Date(ms).toLocaleString('es-MX', {
    timeZone: LUGAR_DEMO.zona, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })
}
