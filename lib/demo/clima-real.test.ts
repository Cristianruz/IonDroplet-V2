import { test } from 'node:test'
import assert from 'node:assert/strict'
import { avisosDelClima, climaValido, proximasHoras, pronosticoEnTexto, LUGAR_DEMO, type ClimaReal } from './clima-real.ts'
import { climaReal, fijarClimaReal } from './clima.ts'
import { contextoDelSistema, indicadores, sincronizarAlertasDelClima } from './contexto-ia.ts'
import { crearEstado } from './simulacion.ts'
import { responder } from './api-demo.ts'

const AHORA = Date.UTC(2026, 9, 7, 3, 30) // 6 oct, 21:30 en Chihuahua

function climaDePrueba(minimas = [17.9, 16.2, 16, 18.4, 19, 19.5, 21.7]): ClimaReal {
  return {
    lugar: LUGAR_DEMO.nombre,
    latitud: LUGAR_DEMO.latitud,
    longitud: LUGAR_DEMO.longitud,
    consultado: new Date(AHORA).toISOString(),
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

test('el lugar de la demostración es la ciudad de Chihuahua, no Delicias', () => {
  assert.equal(LUGAR_DEMO.nombre, 'Chihuahua, Chih.')
  assert.ok(Math.abs(LUGAR_DEMO.latitud - 28.63) < 0.05)
  assert.ok(Math.abs(LUGAR_DEMO.longitud - -106.08) < 0.05)
})

test('se descarta una respuesta de Open-Meteo incompleta', () => {
  assert.ok(climaValido(climaDePrueba()))
  assert.ok(!climaValido({ error: true, reason: 'x' }))
  const cortada = climaDePrueba()
  cortada.daily.temperature_2m_max = [20]
  assert.ok(!climaValido(cortada))
})

test('los avisos salen de los números del pronóstico, con las reglas del backend', () => {
  const normal = avisosDelClima(climaDePrueba().daily)
  assert.deepEqual(normal, [])
  const conHelada = avisosDelClima(climaDePrueba([5, 2, -1, 8, 9, 9, 9]).daily)
  assert.equal(conHelada[0].tipo, 'helada')
  assert.equal(conHelada[0].nivel, 'peligro')
  assert.match(conHelada[0].texto, /-1°C/)
  assert.ok(conHelada.some(a => a.nivel === 'aviso' && /mañana/.test(a.texto)))
})

test('las próximas horas empiezan en la hora de ahora', () => {
  const horas = proximasHoras(climaDePrueba().hourly, '2026-10-06T23:10', 4)
  assert.deepEqual(horas.map(h => h.hora), ['2026-10-06T23:00', '2026-10-07T00:00', '2026-10-07T01:00', '2026-10-07T02:00'])
})

test('el texto para la IA trae ahora, próximas horas, 7 días y avisos', () => {
  const texto = pronosticoEnTexto(climaDePrueba(), AHORA)
  assert.match(texto, /CLIMA REAL de Chihuahua, Chih\./)
  assert.match(texto, /Ahora: 20\.8°C/)
  assert.match(texto, /Próximas horas:/)
  assert.equal(texto.split('\n').filter(r => r.startsWith('- ')).length, 7)
})

test('con el clima real, la tarjeta y el balance usan el pronóstico de hoy y lo dicen', () => {
  fijarClimaReal(climaDePrueba())
  try {
    const e = crearEstado(AHORA)
    const r = responder(e, 'GET', 'clima', new URLSearchParams(), {}, AHORA)
    const c = r.cuerpo as { ubicacion: { lugar: string; real: boolean }; ahora: { temperature_2m: number }; dias: { time: string[] }; horas: unknown[] }
    assert.equal(c.ubicacion.lugar, 'Chihuahua, Chih.')
    assert.equal(c.ubicacion.real, true)
    assert.equal(c.ahora.temperature_2m, 20.8)
    assert.equal(c.dias.time[0], '2026-10-06')
    assert.ok(c.horas.length > 0)
  } finally {
    fijarClimaReal(null)
  }
})

test('sin el clima real, la tarjeta dice que el pronóstico es de ejemplo', () => {
  assert.equal(climaReal(), null)
  const e = crearEstado(AHORA)
  const c = responder(e, 'GET', 'clima', new URLSearchParams(), {}, AHORA).cuerpo as { ubicacion: { real: boolean } }
  assert.equal(c.ubicacion.real, false)
  assert.ok(indicadores(e, AHORA).faltantes.some(f => /clima real/.test(f)))
})

test('una helada del pronóstico entra a la campana y se resuelve cuando el pronóstico ya no la trae', () => {
  const e = crearEstado(AHORA)
  fijarClimaReal(climaDePrueba([5, 2, -1, 8, 9, 9, 9]))
  try {
    sincronizarAlertasDelClima(e, AHORA)
    const helada = e.alertas.filter(a => a.regla === 'clima_helada')
    assert.ok(helada.length >= 1)
    assert.ok(helada.some(a => a.severidad === 'critica' && a.estado === 'nueva'))
    assert.match(helada[0].detalle, /real de Chihuahua/)
    // Repetir no la duplica.
    sincronizarAlertasDelClima(e, AHORA)
    assert.equal(e.alertas.filter(a => a.regla === 'clima_helada').length, helada.length)

    fijarClimaReal(climaDePrueba())
    sincronizarAlertasDelClima(e, AHORA)
    assert.ok(e.alertas.filter(a => a.regla === 'clima_helada').every(a => a.estado === 'resuelta'))
  } finally {
    fijarClimaReal(null)
  }
})

test('el contexto para la IA lleva lo que muestra la app, sin el clima (ese lo pone el servidor)', () => {
  const e = crearEstado(AHORA)
  const texto = contextoDelSistema(e, AHORA)
  assert.match(texto, /Humedad de la tierra: \d+%/)
  assert.match(texto, /Punto de riego: la bomba enciende sola cuando la humedad baja de \d+%/)
  assert.match(texto, /Huerta Norte/)
  assert.match(texto, /ciudad de Chihuahua/)
  assert.doesNotMatch(texto, /Delicias/)
  assert.doesNotMatch(texto, /PRONÓSTICO|CLIMA REAL/)
})

test('los indicadores del análisis usan la mínima del pronóstico real y la helada del nogal', () => {
  fijarClimaReal(climaDePrueba([5, 2, -1, 8, 9, 9, 9]))
  try {
    const ind = indicadores(crearEstado(AHORA), AHORA)
    assert.equal(ind.helada.minima_pronosticada, -1)
    assert.equal(ind.helada.critica_del_cultivo, -2)
    assert.equal(ind.helada.margen_grados, 1)
    assert.equal(ind.helada.nivel, 'medio')
    assert.equal(ind.lluvia.es_probabilidad_real, true)
  } finally {
    fijarClimaReal(null)
  }
})
