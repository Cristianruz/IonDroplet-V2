// El clima de la demostración.
//
// Es el real de la ciudad de Chihuahua: el navegador se lo pide al servidor de
// la demostración (/api/demo/clima), que a su vez se lo pide a Open-Meteo, y
// queda aquí con fijarClimaReal(). Con él se arman la tarjeta del clima, los
// avisos, el balance de agua y lo que lee la IA.
//
// Si el clima real no contesta (sin internet, Open-Meteo caído), se usa una
// semana de otoño guardada, y la tarjeta lo dice: "pronóstico de ejemplo".
// Nunca se enseña la semana guardada como si fuera la de hoy sin avisarlo.

import { DIA, redondear } from './simulacion.ts'
import {
  LUGAR_DEMO,
  avisosDelClima,
  horaLocalDeChihuahua,
  proximasHoras,
  type AvisoDelClima,
  type ClimaReal,
} from './clima-real.ts'

const PLANTILLA = {
  max: [25.7, 22.2, 21.3, 17, 21.6, 24, 24.7],
  min: [15.3, 15.4, 14.8, 15.6, 15.5, 17.2, 17],
  lluvia: [0, 0, 0, 3.7, 2, 2.4, 8.1],
  probabilidad: [2, 11, 33, 32, 40, 17, 31],
  viento: [18, 19.9, 20.6, 7.4, 12.6, 11, 11.2],
  codigo: [3, 3, 3, 55, 51, 53, 80],
  et0: [5.49, 4.3, 2.93, 0.52, 2.05, 2.78, 3.24],
}

export const UBICACION_DEMO = { latitud: LUGAR_DEMO.latitud, longitud: LUGAR_DEMO.longitud }

let real: ClimaReal | null = null

/** Lo que llegó de /api/demo/clima. null lo olvida (las pruebas lo usan). */
export function fijarClimaReal(c: ClimaReal | null): void {
  real = c
}

export function climaReal(): ClimaReal | null {
  return real
}

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
  if (real) {
    const d = real.daily
    return {
      time: d.time,
      temperature_2m_max: d.temperature_2m_max,
      temperature_2m_min: d.temperature_2m_min,
      precipitation_sum: d.precipitation_sum.map(v => v ?? 0),
      precipitation_probability_max: d.precipitation_probability_max.map(v => v ?? 0),
      wind_speed_10m_max: d.wind_speed_10m_max,
      weather_code: d.weather_code ?? [],
      et0_fao_evapotranspiration: d.et0_fao_evapotranspiration.map(v => v ?? 0),
    }
  }
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

/** Los avisos del pronóstico que esté en uso, real o de ejemplo. */
export function avisosDeHoy(ahora: number): AvisoDelClima[] {
  return avisosDelClima(diasDeClima(ahora))
}

/** La temperatura de este momento: la mínima al amanecer, la máxima a las 4. */
function factorDelDia(ms: number): number {
  const d = new Date(ms)
  const hora = d.getHours() + d.getMinutes() / 60
  return 0.5 + 0.5 * Math.cos((2 * Math.PI * (hora - 16)) / 24)
}

/** El escenario "Que llueva" es simulado: se dice así, aunque el resto sea real. */
function avisoDeLluviaSimulada(dia: string, lluviaAhora: number): AvisoDelClima {
  return { tipo: 'lluvia', nivel: 'aviso', dia, texto: `Está lloviendo ahora (prueba "Que llueva"): unos ${lluviaAhora} mm por hora.` }
}

export function clima(ahora: number, desde: string, lluviaAhora = 0) {
  const dias = diasDeClima(ahora)

  if (real) {
    const a = real.current
    const avisos = avisosDelClima(real.daily)
    return {
      ubicacion: {
        ...UBICACION_DEMO,
        fuente: 'demostracion',
        desde,
        lugar: real.lugar,
        real: true,
        consultado: real.consultado,
      },
      ahora: lluviaAhora > 0
        ? { ...a, temperature_2m: redondear(a.temperature_2m - 3), relative_humidity_2m: 94, precipitation: lluviaAhora, wind_speed_10m: 24, weather_code: 63 }
        : a,
      dias,
      horas: proximasHoras(real.hourly, horaLocalDeChihuahua(ahora), 12),
      avisos: lluviaAhora > 0 ? [avisoDeLluviaSimulada(dias.time[0], lluviaAhora), ...avisos] : avisos,
    }
  }

  // Sin el clima real: la semana guardada, y la tarjeta avisa que es de ejemplo.
  const f = factorDelDia(ahora)
  const temperatura = redondear(dias.temperature_2m_min[0] + (dias.temperature_2m_max[0] - dias.temperature_2m_min[0]) * f)
  const avisos = avisosDelClima(dias)
  return {
    ubicacion: { ...UBICACION_DEMO, fuente: 'demostracion', desde, lugar: LUGAR_DEMO.nombre, real: false, consultado: null },
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
    horas: [],
    avisos: lluviaAhora > 0 ? [avisoDeLluviaSimulada(dias.time[0], lluviaAhora), ...avisos] : avisos,
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
