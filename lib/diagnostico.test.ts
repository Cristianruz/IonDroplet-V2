import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PARTES,
  TEXTO_TIPO,
  colorDeUrgencia,
  preguntaDeSeguimiento,
  type ReporteDiagnostico,
} from './diagnostico.ts'

const base: ReporteDiagnostico = {
  fotoUtil: true,
  problemaDeFoto: '',
  esPlanta: true,
  plantaVista: 'Nogal pecanero',
  coincideConCultivo: 'si',
  resumen: 'Tiene manchas en las hojas.',
  observaciones: [],
  hipotesis: [],
  severidad: 'leve',
  urgencia: 'media',
  relacionConElRiego: '',
  accionesInmediatas: [],
  cuandoLlamarATecnico: '',
  siguienteFoto: '',
}

const hipotesis = (nombre: string) => ({
  nombre,
  nombreCientifico: '',
  tipo: 'hongo' as const,
  probabilidad: 'media' as const,
  aFavor: [],
  enContra: [],
  comoConfirmarlo: '',
  delCatalogo: false,
})

test('las partes de la planta coinciden con las que acepta el backend', () => {
  // ia/diagnostico-foto.js del backend: PARTES, sin "otra" (que es el valor por omisión).
  assert.deepEqual(
    PARTES.map(p => p.id),
    ['hoja', 'enves', 'fruto', 'flor', 'tallo', 'raiz', 'planta', 'bicho']
  )
})

test('cada tipo de causa tiene su texto', () => {
  assert.equal(Object.keys(TEXTO_TIPO).length, 15)
  assert.ok(Object.values(TEXTO_TIPO).every(t => t.length > 0))
})

test('la urgencia alta va en rojo y la ninguna en verde', () => {
  assert.equal(colorDeUrgencia('alta'), 'var(--peligro)')
  assert.equal(colorDeUrgencia('ninguna'), 'var(--verde)')
})

test('la pregunta al asistente lleva la causa principal y las otras', () => {
  const p = preguntaDeSeguimiento({ ...base, hipotesis: [hipotesis('Roña del nogal'), hipotesis('Mancha foliar')] })
  assert.match(p, /lo más probable es Roña del nogal/)
  assert.match(p, /También podría ser Mancha foliar/)
})

test('sin hipótesis, la pregunta usa el resumen', () => {
  assert.match(preguntaDeSeguimiento(base), /Tiene manchas en las hojas/)
})
