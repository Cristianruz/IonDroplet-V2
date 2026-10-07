import { test } from 'node:test'
import assert from 'node:assert/strict'
import { avisosDelClima, climaValido, proximasHoras, pronosticoEnTexto, LUGAR_DEMO } from './clima-real.ts'
import { climaDePrueba } from './clima-de-prueba.ts'
import { climaReal, fijarClimaReal } from './clima.ts'
import { contextoDelSistema, indicadores, sincronizarAlertasDelClima } from './contexto-ia.ts'
import { crearEstado } from './simulacion.ts'
import { responder } from './api-demo.ts'

const AHORA = Date.UTC(2026, 9, 7, 3, 30) // 6 oct, 21:30 en Chihuahua

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
  assert.ok(indicadores(e, AHORA).faltantes.some(f => /No se pudo consultar el clima/.test(f)))
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
