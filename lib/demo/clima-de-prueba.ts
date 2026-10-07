// Un clima real de Chihuahua (el del 6 oct 2026, 21:30) para las pruebas.
// No es parte de la app: solo lo importan los archivos .test.ts.

import { LUGAR_DEMO, type ClimaReal } from './clima-real.ts'

export function climaDePrueba(
  minimas = [17.9, 16.2, 16, 18.4, 19, 19.5, 21.7],
  consultado = Date.UTC(2026, 9, 7, 3, 30)
): ClimaReal {
  return {
    lugar: LUGAR_DEMO.nombre,
    latitud: LUGAR_DEMO.latitud,
    longitud: LUGAR_DEMO.longitud,
    consultado: new Date(consultado).toISOString(),
    current: { time: '2026-10-06T21:30', temperature_2m: 20.8, relative_humidity_2m: 54, apparent_temperature: 20.6, precipitation: 0, wind_speed_10m: 3.1, weather_code: 0, is_day: 0 },
    hourly: {
      time: Array.from({ length: 24 }, (_, i) => {
        const h = 21 + i
        return h < 24 ? `2026-10-06T${h}:00` : `2026-10-07T${String(h - 24).padStart(2, '0')}:00`
      }),
      temperature_2m: Array.from({ length: 24 }, (_, i) => 21 - i * 0.2),
      precipitation_probability: Array.from({ length: 24 }, () => 5),
      precipitation: Array.from({ length: 24 }, () => 0),
      weather_code: Array.from({ length: 24 }, () => 1),
    },
    daily: {
      time: ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'],
      temperature_2m_max: [26.6, 28.4, 25.6, 26, 27.2, 29.5, 30.2],
      temperature_2m_min: minimas,
      precipitation_sum: [0, 0, 0.2, 0, 0, 0.2, 0.3],
      precipitation_probability_max: [9, 13, 27, 8, 11, 11, 20],
      wind_speed_10m_max: [8.6, 15.6, 23.4, 12.9, 22, 20.9, 26.8],
      weather_code: [3, 3, 3, 3, 3, 51, 51],
      et0_fao_evapotranspiration: [2.62, 4.2, 3.59, 3.76, 4.92, 5.57, 5.7],
    },
  }
}
