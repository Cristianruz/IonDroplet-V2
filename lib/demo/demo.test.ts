import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DIA, HORA, MIN, crearEstado, humedadActual, sqlTs, type Estado } from './simulacion.ts'
import { responder } from './api-demo.ts'
import { desconectarSensor, llover, reconectarSensor, resumen, secarTierra } from './escenarios.ts'

const AHORA = Date.UTC(2026, 9, 1, 18, 0, 0)

function pedir(e: Estado, metodo: string, rutaConConsulta: string, cuerpo: Record<string, unknown> = {}, ahora = AHORA) {
  const url = new URL(rutaConConsulta, 'http://demo')
  return responder(e, metodo, url.pathname.replace(/^\//, ''), url.searchParams, cuerpo, ahora)
}

test('arranca con 30 días de historia y la bomba apagada en automático', () => {
  const e = crearEstado(AHORA)
  const lecturas = e.lecturas[1]
  assert.ok(lecturas[0].t <= AHORA - 29 * DIA)
  assert.ok(lecturas.every(l => l.h >= 8 && l.h <= 88))
  assert.equal(e.bomba, 0)
  assert.equal(e.auto, true)
  assert.ok(humedadActual(e) >= e.umbral)
  const riegos = e.registros.filter(r => r.tipo === 'riego' && r.parcela_id === 1)
  assert.ok(riegos.length >= 15, `hubo ${riegos.length} riegos en 30 días`)
  assert.ok(riegos.every(r => (r.duracion_seg ?? 0) > 0))
})

test('la misma semilla da la misma historia', () => {
  assert.deepEqual(crearEstado(AHORA).lecturas[1], crearEstado(AHORA).lecturas[1])
})

test('todas las rutas que usa la app contestan', () => {
  const e = crearEstado(AHORA)
  const rutas = [
    'sensors/latest', 'sensors/history?hours=24&max=240', 'sensors/resumen?hours=24', 'esp/status',
    'parcelas', 'parcelas/1', 'parcelas/comparar?hours=168&max=200', 'thresholds', 'ionization/estado',
    'riego/eficiencia?dias=90', 'logs?limit=200', 'logs?limit=200&hours=24', 'logs/resumen?hours=168',
    'fertirriego?limit=50', 'fertirriego/resumen?dias=90', 'clima', 'agua/balance?dias=7',
    'alertas?limit=80', 'alertas/resumen', 'agente/estado', 'agente/decisiones?limit=15',
    'ai/consejo?pantalla=inicio', 'ai/consejo?pantalla=parcela', 'ai/consejo?pantalla=historial',
    'ai/consejo?pantalla=plagas', 'ai/analisis',
  ]
  for (const ruta of rutas) {
    const r = pedir(e, 'GET', ruta)
    assert.equal(r.status, 200, ruta)
    assert.doesNotThrow(() => JSON.stringify(r.cuerpo), ruta)
  }
})

test('la gráfica de 24 h no pasa del máximo de puntos pedido', () => {
  const e = crearEstado(AHORA)
  const filas = pedir(e, 'GET', 'sensors/history?hours=720&max=100').cuerpo as Array<{ humidity: number; timestamp: string }>
  assert.ok(filas.length <= 101)
  assert.match(filas[0].timestamp, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
})

test('en automático la bomba no obedece; en manual sí', () => {
  const e = crearEstado(AHORA)
  pedir(e, 'POST', 'esp/control', { bomba: 1 })
  assert.equal(e.bomba, 0)
  const r = pedir(e, 'POST', 'esp/control', { bomba: 1, autoMode: false })
  assert.equal(e.bomba, 1)
  assert.deepEqual((r.cuerpo as { settings: unknown }).settings, { autoMode: false, pumpState: 1, espIp: null })
  const antes = humedadActual(e)
  pedir(e, 'GET', 'esp/status', {}, AHORA + 20_000)
  assert.ok(humedadActual(e) > antes, 'regando, la humedad sube')
  pedir(e, 'POST', 'esp/control', { bomba: 0 }, AHORA + 20_000)
  assert.equal(e.bomba, 0)
  const riego = e.registros.filter(x => x.tipo === 'riego').at(-1)!
  assert.equal(riego.origen, 'usuario')
  assert.equal(riego.duracion_seg, 20)
})

test('el riego a mano se corta solo a los 20 minutos', () => {
  const e = crearEstado(AHORA)
  pedir(e, 'POST', 'esp/control', { bomba: 1, autoMode: false })
  pedir(e, 'GET', 'esp/status', {}, AHORA + 21 * MIN)
  assert.equal(e.bomba, 0)
  assert.ok(e.registros.some(r => r.tipo === 'freno'))
})

test('subir el punto de riego arriba de la humedad hace que el automático riegue y pare solo', () => {
  const e = crearEstado(AHORA)
  const h = humedadActual(e)
  assert.equal(pedir(e, 'POST', 'thresholds', { hum_max: Math.min(90, h + 10) }).status, 200)
  pedir(e, 'GET', 'esp/status', {}, AHORA + 5_000)
  assert.equal(e.bomba, 1)
  pedir(e, 'GET', 'esp/status', {}, AHORA + 10 * MIN)
  assert.equal(e.bomba, 0)
  const riego = e.registros.filter(x => x.tipo === 'riego').at(-1)!
  assert.equal(riego.origen, 'umbral')
})

test('el punto de riego fuera de 10–90 se rechaza', () => {
  const e = crearEstado(AHORA)
  assert.equal(pedir(e, 'POST', 'thresholds', { hum_max: 95 }).status, 400)
  assert.equal(pedir(e, 'POST', 'ai/umbral/aplicar', { valor: 5 }).status, 400)
})

test('el agente no mueve el punto más de 5 y se puede deshacer', () => {
  const e = crearEstado(AHORA)
  pedir(e, 'POST', 'thresholds', { hum_max: 70 })
  pedir(e, 'POST', 'agente/correr', {}, AHORA + HORA)
  const d = e.decisiones[0]
  assert.equal(d.herramienta, 'actualizar_umbral_riego')
  assert.equal(d.valor_antes, 70)
  assert.equal(d.valor_despues, 65)
  assert.equal(d.acotada, true)
  assert.equal(e.umbral, 65)
  assert.equal(pedir(e, 'POST', `agente/revertir/${d.id}`, {}, AHORA + 2 * HORA).status, 200)
  assert.equal(e.umbral, 70)
  assert.equal(pedir(e, 'POST', `agente/revertir/${d.id}`, {}, AHORA + 2 * HORA).status, 400)
})

test('el diagnóstico por foto avisa que es un ejemplo', () => {
  const e = crearEstado(AHORA)
  const r = pedir(e, 'POST', 'ai/foto', { fotos: [{ tipo: 'image/jpeg', datos: 'x' }], parcelaId: 1 })
  assert.equal(r.status, 200)
  assert.match((r.cuerpo as { resumen: string }).resumen, /ejemplo/i)
})

test('el chat ofrece detener solo si está regando', () => {
  const e = crearEstado(AHORA)
  assert.equal((pedir(e, 'POST', 'chat', { pregunta: 'Detén el riego' }).cuerpo as { accion: unknown }).accion, null)
  pedir(e, 'POST', 'esp/control', { bomba: 1, autoMode: false })
  assert.equal((pedir(e, 'POST', 'chat', { pregunta: 'Detén el riego' }).cuerpo as { accion: unknown }).accion, 'detener')
})

test('alertas: verlas apaga el contador', () => {
  const e = crearEstado(AHORA)
  assert.ok((pedir(e, 'GET', 'alertas/resumen').cuerpo as { sinVer: number }).sinVer > 0)
  pedir(e, 'POST', 'alertas/vistas')
  assert.equal((pedir(e, 'GET', 'alertas/resumen').cuerpo as { sinVer: number }).sinVer, 0)
})

test('fertirriego: se agrega y se borra', () => {
  const e = crearEstado(AHORA)
  assert.equal(pedir(e, 'POST', 'fertirriego', { nutrientes: [] }).status, 400)
  const r = pedir(e, 'POST', 'fertirriego', { nutrientes: [{ nutriente: 'K', cantidad: 5, unidad: 'kg' }] })
  const id = (r.cuerpo as { id: number }).id
  assert.equal(pedir(e, 'DELETE', `fertirriego/${id}`).status, 200)
  assert.equal(pedir(e, 'DELETE', `fertirriego/${id}`).status, 404)
})

test('la pestaña que se queda abierta horas se pone al corriente', () => {
  const e = crearEstado(AHORA)
  pedir(e, 'GET', 'esp/status', {}, AHORA + 30 * HORA)
  const ultima = e.lecturas[1].at(-1)!
  assert.ok(ultima.t >= AHORA + 30 * HORA - MIN)
  // En 30 horas el automático tuvo que regar al menos una vez.
  assert.ok(e.registros.some(r => r.tipo === 'riego' && r.t > AHORA))
})

// --- Los escenarios que provoca la visita ---

test('secar la tierra: el automático riega solo en segundos y para en cuanto pasa el punto', () => {
  const e = crearEstado(AHORA)
  secarTierra(e, AHORA)
  assert.ok(humedadActual(e) < e.umbral)
  pedir(e, 'GET', 'esp/status', {}, AHORA + 3_000)
  assert.equal(e.bomba, 1)
  // Un riego completo de la demostración cabe en un minuto.
  pedir(e, 'GET', 'esp/status', {}, AHORA + 60_000)
  assert.equal(e.bomba, 0)
  const riego = e.registros.filter(x => x.tipo === 'riego').at(-1)!
  assert.equal(riego.origen, 'umbral')
  assert.ok((riego.duracion_seg ?? 0) > 0 && (riego.duracion_seg ?? 0) <= 60)
  // Como el backend real: se apaga en cuanto pasa el punto, sin margen.
  const h = humedadActual(e)
  assert.ok(h >= e.umbral && h <= e.umbral + 2, `paró en ${h}% con el punto en ${e.umbral}%`)
  const r = pedir(e, 'POST', 'chat', { pregunta: '¿Por qué regó?' }, AHORA + 61_000)
  assert.match((r.cuerpo as { respuesta: string }).respuesta, /se apagó solo en cuanto la tierra pasó de/)
})

test('secar la tierra también vuelve a poner el riego en automático', () => {
  const e = crearEstado(AHORA)
  pedir(e, 'POST', 'esp/control', { autoMode: false })
  secarTierra(e, AHORA)
  assert.equal(e.auto, true)
})

test('sensor desconectado: la lectura envejece, avisa y el automático no decide', () => {
  const e = crearEstado(AHORA)
  const antes = humedadActual(e)
  desconectarSensor(e, AHORA)
  const fila = pedir(e, 'GET', 'sensors/latest').cuerpo as { timestamp: string; humidity: number }
  assert.equal(fila.humidity, antes, 'al desconectar no brinca el número')
  const edad = AHORA - new Date(fila.timestamp.replace(' ', 'T') + 'Z').getTime()
  assert.ok(edad > 5 * MIN && edad < 8 * MIN, `la última lectura tiene ${edad / MIN} minutos`)
  assert.ok(e.alertas.some(a => a.regla === 'sensor_mudo' && a.estado === 'nueva' && a.severidad === 'critica'))
  // Aunque la tierra baje del punto, sin lecturas no se prende la bomba.
  e.h[1] = e.umbral - 10
  pedir(e, 'GET', 'esp/status', {}, AHORA + 5 * MIN)
  assert.equal(e.bomba, 0)
  assert.equal(resumen(e).sensor, false)

  reconectarSensor(e, AHORA + 5 * MIN)
  const nueva = pedir(e, 'GET', 'sensors/latest', {}, AHORA + 5 * MIN).cuerpo as { timestamp: string }
  assert.equal(nueva.timestamp, sqlTs(AHORA + 5 * MIN))
  assert.ok(!e.alertas.some(a => a.regla === 'sensor_mudo' && a.estado === 'nueva'))
  pedir(e, 'GET', 'esp/status', {}, AHORA + 5 * MIN + 3_000)
  assert.equal(e.bomba, 1)
})

test('que llueva: el clima dice que llueve, la tierra se moja sola y luego para', () => {
  const e = crearEstado(AHORA)
  const antes = humedadActual(e)
  llover(e, AHORA)
  const c = pedir(e, 'GET', 'clima', {}, AHORA + 1_000).cuerpo as { ahora: { precipitation: number; weather_code: number }; avisos: Array<{ texto: string }> }
  assert.ok(c.ahora.precipitation > 0)
  assert.equal(c.ahora.weather_code, 63)
  assert.match(c.avisos[0].texto, /lloviendo ahora/)
  pedir(e, 'GET', 'esp/status', {}, AHORA + 2 * MIN)
  assert.ok(humedadActual(e) > antes, `subió de ${antes}% a ${humedadActual(e)}%`)
  assert.equal(resumen(e).lloviendo, true)
  // Pasados los tres minutos deja de llover.
  const despues = pedir(e, 'GET', 'clima', {}, AHORA + 4 * MIN).cuerpo as { ahora: { precipitation: number } }
  assert.equal(despues.ahora.precipitation, 0)
  assert.equal(resumen(e).lloviendo, false)
})
