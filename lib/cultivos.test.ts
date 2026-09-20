// Pruebas del catálogo de cultivos y etapas.
//
// Lo que se cuida aquí: que las etapas que ve el agricultor siempre sepan a
// qué fase pertenecen. De esa fase dependen el Kc del backend (el cálculo de
// cuánta agua pide el cultivo) y la escena 3D. Una etapa sin fase deja los
// dos sin dato.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  CULTIVOS,
  FASES,
  GRUPOS,
  cultivoPorId,
  etapaEquivalente,
  etapaPorId,
  etapasDeCultivo,
  faseDeEtapa,
  sistemaPorId,
} from './cultivos.ts'

const FASES_VALIDAS = new Set(FASES.map(f => f.id))

test('no hay cultivos repetidos y todos caen en un grupo conocido', () => {
  const ids = CULTIVOS.map(c => c.id)
  assert.equal(new Set(ids).size, ids.length, 'hay ids de cultivo repetidos')
  for (const c of CULTIVOS) {
    assert.ok(GRUPOS.includes(c.grupo), `${c.id} tiene un grupo desconocido: ${c.grupo}`)
    assert.ok(c.nombre.trim() !== '', `${c.id} sin nombre`)
  }
})

test('cada cultivo tiene etapas, y cada etapa una fase válida y su explicación', () => {
  for (const cultivo of CULTIVOS) {
    const etapas = etapasDeCultivo(cultivo.id)
    assert.ok(etapas.length >= 5, `${cultivo.id} tiene muy pocas etapas`)

    const ids = etapas.map(e => e.id)
    assert.equal(new Set(ids).size, ids.length, `${cultivo.id} repite ids de etapa`)

    for (const e of etapas) {
      assert.ok(FASES_VALIDAS.has(e.fase), `${cultivo.id}/${e.id} tiene una fase inválida`)
      assert.ok(e.explicacion.trim() !== '', `${cultivo.id}/${e.id} sin explicación`)
      // La etapa siempre se puede traducir a fase: de eso viven el Kc y el 3D.
      assert.equal(faseDeEtapa(e.id, cultivo.id), e.fase)
    }
  }
})

test('las seis fases siguen resolviéndose: las parcelas viejas guardaron esos ids', () => {
  for (const f of FASES) {
    assert.equal(faseDeEtapa(f.id), f.id)
    assert.equal(etapaPorId(f.id)?.id, f.id)
  }
})

test('el cultivo se encuentra por id, por nombre y sin importar acentos', () => {
  assert.equal(cultivoPorId('nogal')?.id, 'nogal')
  assert.equal(cultivoPorId('Nogal pecanero')?.id, 'nogal')
  assert.equal(cultivoPorId('  MAÍZ ')?.id, 'maiz')
  assert.equal(cultivoPorId('maiz')?.id, 'maiz')
  assert.equal(cultivoPorId('lo que sea'), null)
  assert.equal(cultivoPorId(null), null)
})

test('una etapa que no existe no se adivina', () => {
  assert.equal(faseDeEtapa('etapa-inventada'), null)
  assert.equal(faseDeEtapa(null), null)
  assert.equal(etapaPorId(''), null)
})

test('el sistema de riego viejo de la base ("suelo") cuenta como no capturado', () => {
  assert.equal(sistemaPorId('suelo'), null)
  assert.equal(sistemaPorId('goteo')?.id, 'goteo')
  assert.equal(sistemaPorId('Aspersión')?.id, 'aspersion')
})

test('el nogal trae sus etapas propias, no las genéricas', () => {
  const ids = etapasDeCultivo('nogal').map(e => e.id)
  assert.ok(ids.includes('llenado_almendra'), 'falta el llenado de almendra')
  assert.ok(ids.includes('reposo_invernal'), 'falta el reposo invernal')
  assert.equal(faseDeEtapa('llenado_almendra', 'nogal'), 'fruto')
})

test('una fase vieja se traduce a la etapa representativa del cultivo', () => {
  // La parcela del nogal tiene guardada la fase vieja "descanso".
  assert.equal(etapaEquivalente('descanso', 'nogal')?.id, 'reposo_invernal')
  assert.equal(etapaEquivalente('fruto', 'nogal')?.id, 'llenado_almendra')
  assert.equal(etapaEquivalente('floracion', 'maiz')?.id, 'espigado_floracion')
  // Una etapa que ya es del cultivo se queda igual.
  assert.equal(etapaEquivalente('brotacion', 'nogal')?.id, 'brotacion')
  assert.equal(etapaEquivalente('lo-que-sea', 'nogal'), null)
})
