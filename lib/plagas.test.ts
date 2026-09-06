// Pruebas de la única lógica no trivial del frontend.
// Se corren con `npm test` (el runner de Node, sin dependencias).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularRiesgo,
  condicionSeCumple,
  ordenarPorRiesgo,
  plagasDeCultivo,
  PLAGAS_POR_CULTIVO,
  HUMEDAD_SECA,
  HUMEDAD_HUMEDA,
  MESES_CALIENTES,
  type Plaga,
} from './plagas.ts'

const JULIO = 7
const ENERO = 1

function plaga(favorecidaPor: Plaga['favorecidaPor'], mesesActiva: number[]): Plaga {
  return {
    id: 'prueba',
    nombre: 'De prueba',
    icono: '🐛',
    comoReconocerla: '',
    queHacer: '',
    mesesActiva,
    favorecidaPor,
  }
}

// --- condicionSeCumple ---

test('la tierra seca se cumple por debajo del umbral', () => {
  assert.equal(condicionSeCumple('seco', HUMEDAD_SECA - 1, JULIO), true)
  assert.equal(condicionSeCumple('seco', HUMEDAD_SECA, JULIO), false)
  assert.equal(condicionSeCumple('seco', HUMEDAD_SECA + 1, JULIO), false)
})

test('la tierra húmeda se cumple por arriba del umbral', () => {
  assert.equal(condicionSeCumple('humedo', HUMEDAD_HUMEDA + 1, JULIO), true)
  assert.equal(condicionSeCumple('humedo', HUMEDAD_HUMEDA, JULIO), false)
  assert.equal(condicionSeCumple('humedo', HUMEDAD_HUMEDA - 1, JULIO), false)
})

test('el calor se estima por el mes, no por un termómetro', () => {
  for (const mes of MESES_CALIENTES) {
    assert.equal(condicionSeCumple('calor', null, mes), true)
  }
  assert.equal(condicionSeCumple('calor', null, ENERO), false)
})

test('sin lectura del sensor no se inventa la condición de humedad', () => {
  assert.equal(condicionSeCumple('seco', null, JULIO), null)
  assert.equal(condicionSeCumple('humedo', null, JULIO), null)
})

// --- calcularRiesgo: la tabla completa ---

test('temporada y condición juntas dan riesgo alto', () => {
  assert.equal(calcularRiesgo(plaga('seco', [JULIO]), 10, JULIO), 'alto')
  assert.equal(calcularRiesgo(plaga('humedo', [JULIO]), 90, JULIO), 'alto')
  assert.equal(calcularRiesgo(plaga('calor', [JULIO]), 50, JULIO), 'alto')
})

test('solo la temporada da riesgo medio', () => {
  assert.equal(calcularRiesgo(plaga('seco', [JULIO]), 90, JULIO), 'medio')
})

test('solo la condición da riesgo medio', () => {
  assert.equal(calcularRiesgo(plaga('seco', [ENERO]), 10, JULIO), 'medio')
})

test('sin temporada ni condición, riesgo bajo', () => {
  assert.equal(calcularRiesgo(plaga('seco', [ENERO]), 90, JULIO), 'bajo')
})

test('sin lectura del sensor el riesgo nunca sube a alto', () => {
  assert.equal(calcularRiesgo(plaga('seco', [JULIO]), null, JULIO), 'medio')
  assert.equal(calcularRiesgo(plaga('seco', [ENERO]), null, JULIO), 'bajo')
})

test('una plaga de calor sí puede ser alta sin sensor: el mes basta', () => {
  assert.equal(calcularRiesgo(plaga('calor', [JULIO]), null, JULIO), 'alto')
})

// --- ordenarPorRiesgo ---

test('la de mayor riesgo queda arriba', () => {
  // Con la tierra en 10% y estando en julio:
  const lista = [
    plaga('humedo', [ENERO]), // bajo: ni temporada ni condición
    plaga('seco', [JULIO]),   // alto: temporada y condición
    plaga('humedo', [JULIO]), // medio: temporada sí, condición no
  ]
  const orden = ordenarPorRiesgo(lista, 10, JULIO).map(r => r.riesgo)
  assert.deepEqual(orden, ['alto', 'medio', 'bajo'])
})

test('ordenar no pierde ni duplica plagas', () => {
  const lista = PLAGAS_POR_CULTIVO.nogal
  assert.equal(ordenarPorRiesgo(lista, 35, JULIO).length, lista.length)
})

// --- catálogo ---

test('cada cultivo trae plagas y un cultivo desconocido cae en las genéricas', () => {
  for (const [cultivo, lista] of Object.entries(PLAGAS_POR_CULTIVO)) {
    assert.ok(lista.length > 0, `${cultivo} se quedó sin plagas`)
  }
  assert.deepEqual(plagasDeCultivo('lechuga'), PLAGAS_POR_CULTIVO.otro)
  assert.deepEqual(plagasDeCultivo(null), [])
  assert.deepEqual(plagasDeCultivo('NOGAL'), PLAGAS_POR_CULTIVO.nogal)
})

test('no hay dos plagas con el mismo id dentro de un cultivo', () => {
  for (const [cultivo, lista] of Object.entries(PLAGAS_POR_CULTIVO)) {
    const ids = lista.map(p => p.id)
    assert.equal(new Set(ids).size, ids.length, `${cultivo} tiene ids repetidos`)
  }
})

test('los meses son meses de verdad', () => {
  for (const lista of Object.values(PLAGAS_POR_CULTIVO)) {
    for (const p of lista) {
      assert.ok(p.mesesActiva.length > 0, `${p.id} no tiene temporada`)
      for (const mes of p.mesesActiva) {
        assert.ok(mes >= 1 && mes <= 12, `${p.id} tiene el mes ${mes}`)
      }
    }
  }
})

test('toda plaga dice cómo reconocerla y qué hacer', () => {
  for (const lista of Object.values(PLAGAS_POR_CULTIVO)) {
    for (const p of lista) {
      assert.ok(p.comoReconocerla.length > 20, `${p.id} sin cómo reconocerla`)
      assert.ok(p.queHacer.length > 20, `${p.id} sin qué hacer`)
      assert.ok(p.icono.length > 0, `${p.id} sin icono`)
    }
  }
})
