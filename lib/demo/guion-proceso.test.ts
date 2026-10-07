import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DURACION_PROCESO, PUNTO_RIEGO, momentoProceso, saltarPaso } from './guion-proceso.ts'

const CUADROS = Array.from({ length: Math.ceil(DURACION_PROCESO * 10) }, (_, i) => momentoProceso(i / 10))

test('el relé solo está cerrado mientras la lectura va abajo del punto de riego', () => {
  for (const m of CUADROS) {
    if (m.rele) assert.ok(m.humedad < PUNTO_RIEGO, `${m.paso}: relé con ${m.humedad}`)
  }
  // Y se suelta justo al llegar al punto.
  const apagado = CUADROS.find(m => m.paso === 'apaga' && !m.rele)!
  assert.equal(apagado.humedad, PUNTO_RIEGO)
})

test('el agua no corre sin el relé y llega hasta el gotero', () => {
  let antes = 0
  for (const m of CUADROS) {
    if (m.paso === 'ioniza' || m.paso === 'bomba' || m.paso === 'viaja') {
      assert.ok(m.rele)
      assert.ok(m.frente >= antes - 1e-9, 'el agua no se regresa')
      antes = m.frente
    }
    if (m.paso === 'inicio' || m.paso === 'mide' || m.paso === 'avisa') assert.equal(m.frente, 0)
  }
  assert.equal(CUADROS.find(m => m.paso === 'gotea')!.frente, 1)
})

test('la tierra solo se moja después de que llega el agua', () => {
  for (const m of CUADROS) if (m.mojado > 0) assert.equal(m.frente, 1)
})

test('los textos dicen lo que hace el sistema, sin prometer efectos de la ionización', () => {
  const textos = CUADROS.map(m => `${m.titulo} ${m.detalle}`).join(' ').toLowerCase()
  for (const promesa of ['mejor', 'aprovecha', 'absorb', 'nutrient', 'crece más', 'rinde']) {
    assert.ok(!textos.includes(promesa), `promete "${promesa}"`)
  }
  assert.ok(textos.includes('12 v'))
  assert.ok(textos.includes('mismo relé'))
})

test('las flechas llevan al paso de junto y la vuelta se repite igual', () => {
  const s = saltarPaso(0, 1)
  assert.equal(momentoProceso(s).paso, 'mide')
  assert.equal(momentoProceso(s).avance, 0)
  assert.equal(saltarPaso(s + 3, -1), s)
  assert.equal(momentoProceso(5.5).paso, momentoProceso(5.5 + DURACION_PROCESO * 2).paso)
  assert.equal(momentoProceso(40).humedad, momentoProceso(40 + DURACION_PROCESO).humedad)
})
