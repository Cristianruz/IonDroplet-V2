// El pronóstico de la demostración.
//
// Es un pronóstico real de una semana de otoño en el centro de Chihuahua,
// guardado una vez y corrido a las fechas de hoy. Se usa uno fijo para que el
// clima, el balance de agua, las alertas y lo que dice el asistente cuadren
// entre sí. El lugar es de ejemplo: Delicias, no la huerta de nadie.

import { DIA, redondear } from './simulacion.ts'

const PLANTILLA = {
  max: [25.7, 22.2, 21.3, 17, 21.6, 24, 24.7],
  min: [15.3, 15.4, 14.8, 15.6, 15.5, 17.2, 17],
  lluvia: [0, 0, 0, 3.7, 2, 2.4, 8.1],
  probabilidad: [2, 11, 33, 32, 40, 17, 31],
  viento: [18, 19.9, 20.6, 7.4, 12.6, 11, 11.2],
  codigo: [3, 3, 3, 55, 51, 53, 80],
  et0: [5.49, 4.3, 2.93, 0.52, 2.05, 2.78, 3.24],
}

export const UBICACION_DEMO = { latitud: 28.19, longitud: -105.47 }

/** "2026-10-01" en la hora del aparato, que es la del agricultor. */
export function fechaLocal(ms: number): string {
  const d = new Date(ms)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

export function diaDeLaSemana(ms: number): string {
  return new Date(ms).toLocaleDateString('es-MX', { weekday: 'long' })
}

export interface DiasClima {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_sum: number[]
  precipitation_probability_max: number[]
  wind_speed_10m_max: number[]
  weather_code: number[]
  et0_fao_evapotranspiration: number[]
}

export function diasDeClima(ahora: number): DiasClima {
  return {
    time: PLANTILLA.max.map((_, i) => fechaLocal(ahora + i * DIA)),
    temperature_2m_max: PLANTILLA.max,
    temperature_2m_min: PLANTILLA.min,
    precipitation_sum: PLANTILLA.lluvia,
    precipitation_probability_max: PLANTILLA.probabilidad,
    wind_speed_10m_max: PLANTILLA.viento,
    weather_code: PLANTILLA.codigo,
    et0_fao_evapotranspiration: PLANTILLA.et0,
  }
}

/** La temperatura de este momento: la mínima al amanecer, la máxima a las 4. */
function factorDelDia(ms: number): number {
  const d = new Date(ms)
  const hora = d.getHours() + d.getMinutes() / 60
  return 0.5 + 0.5 * Math.cos((2 * Math.PI * (hora - 16)) / 24)
}

export function clima(ahora: number, desde: string, lluviaAhora = 0) {
  const dias = diasDeClima(ahora)
  const f = factorDelDia(ahora)
  const temperatura = redondear(dias.temperature_2m_min[0] + (dias.temperature_2m_max[0] - dias.temperature_2m_min[0]) * f)

  // El aviso de lluvia, para el día que más agua trae.
  const iLluvia = dias.precipitation_sum.reduce((m, v, i, a) => (v > a[m] ? i : m), 0)
  const avisos = [
    {
      tipo: 'lluvia',
      nivel: 'aviso',
      dia: dias.time[iLluvia],
      texto:
        `Se espera agua el ${diaDeLaSemana(ahora + iLluvia * DIA)}: ` +
        `${dias.precipitation_probability_max[iLluvia]}% de probabilidad, como ${dias.precipitation_sum[iLluvia]} mm.`,
    },
  ]

  return {
    ubicacion: { ...UBICACION_DEMO, fuente: 'telefono', desde },
    ahora: {
      time: new Date(ahora).toISOString().slice(0, 16),
      interval: 900,
      temperature_2m: lluviaAhora > 0 ? redondear(temperatura - 3) : temperatura,
      relative_humidity_2m: lluviaAhora > 0 ? 94 : Math.round(70 - 38 * f),
      precipitation: lluviaAhora,
      wind_speed_10m: lluviaAhora > 0 ? 24 : redondear(9 + 8 * f),
      weather_code: lluviaAhora > 0 ? 63 : dias.weather_code[0],
    },
    dias,
    // Si está lloviendo, es lo primero que se avisa.
    avisos: lluviaAhora > 0
      ? [{ tipo: 'lluvia', nivel: 'aviso', dia: dias.time[0], texto: `Está lloviendo ahora: unos ${lluviaAhora} mm por hora.` }, ...avisos]
      : avisos,
  }
}

/** Lo que pide el cultivo contra lo que va a llover, día por día. */
export function balanceDeDias(ahora: number, kc: number, cuantos: number) {
  const d = diasDeClima(ahora)
  const n = Math.min(cuantos, d.time.length)
  return d.time.slice(0, n).map((fecha, i) => {
    const etc = redondear(d.et0_fao_evapotranspiration[i] * kc, 2)
    return {
      fecha,
      et0_mm: d.et0_fao_evapotranspiration[i],
      etc_mm: etc,
      lluvia_mm: d.precipitation_sum[i],
      deficit_mm: redondear(Math.max(0, etc - d.precipitation_sum[i]), 2),
    }
  })
}
