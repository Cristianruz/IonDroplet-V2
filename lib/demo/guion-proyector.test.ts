import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DURACION_BUCLE, momento, saltarCapitulo, textoHora } from './guion-proyector.ts'

// Un cuadro cada décimo de segundo, una vuelta completa.
const CUADROS = Array.from({ length: Math.ceil(DURACION_BUCLE * 10) }, (_, i) => momento(i / 10))

test('riega solo mientras la lectura está abajo del punto, como el backend', () => {
  for (const m of CUADROS) {
    if (m.regando) assert.ok(m.humedad < m.umbral, `${m.cultivo} ${m.capitulo}: riega con ${m.humedad} y punto ${m.umbral}`)
    else if (m.sensor && m.lluvia === 0) {
      assert.ok(m.humedad >= m.umbral, `${m.cultivo} ${m.capitulo}: ${m.humedad} abajo de ${m.umbral} y no riega`)
    }
  }
})

test('el riego se ve en cada cultivo: entra al decidir y se apaga al llegar al punto', () => {
  for (const ciclo of [0, 1, 2]) {
    const del = CUADROS.filter(m => m.ciclo === ciclo)
    assert.ok(del.filter(m => m.regando).length >= 150, `ciclo ${ciclo}: menos de 15 s regando`)
    assert.ok(del.filter(m => m.regando).every(m => m.capitulo === 'decide' || m.capitulo === 'riega'))
    const detiene = del.find(m => m.capitulo === 'detiene')!
    assert.equal(detiene.humedad, detiene.umbral)
    assert.equal(detiene.regando, false)
  }
})

test('sin sensor no riega y deja quieta la última lectura', () => {
  const mudos = CUADROS.filter(m => !m.sensor)
  assert.ok(mudos.length > 0)
  assert.ok(mudos.every(m => !m.regando))
  assert.equal(new Set(mudos.map(m => m.humedad)).size, 1)
})

test('con lluvia la tierra sube sola y no riega', () => {
  for (const ciclo of [0, 1]) {
    const lluvia = CUADROS.filter(m => m.ciclo === ciclo && m.lluvia > 0)
    assert.ok(lluvia.length > 0)
    assert.ok(lluvia.every(m => !m.regando && m.codigo === 61))
    assert.ok(lluvia[lluvia.length - 1].humedad > lluvia[0].humedad + 5)
  }
})

test('cada cultivo cierra con el código para probarla, sin regar', () => {
  for (const ciclo of [0, 1, 2]) {
    const del = CUADROS.filter(m => m.ciclo === ciclo)
    assert.equal(del[del.length - 1].capitulo, 'pruebala')
    assert.ok(del.filter(m => m.capitulo === 'pruebala').every(m => !m.regando && m.sensor && m.lluvia === 0))
  }
})

test('la explicación usa los números del mismo riego', () => {
  const m = CUADROS.find(x => x.capitulo === 'explica')!
  assert.ok(m.respuesta?.includes(`${m.umbral}%`))
  assert.ok(m.respuesta?.includes(`${m.humedadMinima.toFixed(1)}%`))
  const minimaVista = Math.min(...CUADROS.filter(x => x.ciclo === m.ciclo).map(x => x.humedad))
  assert.equal(minimaVista, m.humedadMinima)
})

test('da vueltas: el mismo segundo de otra vuelta es el mismo cuadro', () => {
  for (const s of [0, 12.3, 77.7, DURACION_BUCLE - 0.1]) {
    const a = momento(s)
    const b = momento(s + DURACION_BUCLE * 3)
    assert.equal(a.capitulo, b.capitulo)
    assert.equal(a.humedad, b.humedad)
    assert.equal(b.inicioCiclo - a.inicioCiclo, DURACION_BUCLE * 3)
  }
})

test('el inicio del ciclo no cambia de un cuadro a otro (es la llave de la escena)', () => {
  for (const vuelta of [0, 1, 7]) {
    const base = vuelta * DURACION_BUCLE
    const inicios = new Set<number>()
    for (let s = base + 0.1; s < base + 20; s += 0.1) inicios.add(momento(s).inicioCiclo)
    assert.deepEqual([...inicios], [base])
  }
})

test('las flechas llevan al capítulo de junto', () => {
  let s = 0
  const vistos: string[] = []
  for (let i = 0; i < 8; i++) {
    vistos.push(`${momento(s).ciclo}:${momento(s).capitulo}`)
    s = saltarCapitulo(s, 1)
    assert.equal(momento(s).avance, 0)
  }
  assert.equal(new Set(vistos).size, 8)
  // Desde el principio de un capítulo, atrás lleva al principio del anterior.
  const tercero = saltarCapitulo(saltarCapitulo(0, 1), 1)
  assert.equal(saltarCapitulo(tercero, -1), saltarCapitulo(0, 1))
  // A media vuelta, atrás regresa al principio del mismo.
  assert.equal(saltarCapitulo(tercero + 5, -1), tercero)
})

test('la hora se escribe como en un reloj', () => {
  assert.equal(textoHora(8.5), '8:30')
  assert.equal(textoHora(15.75), '15:45')
  assert.equal(textoHora(17), '17:00')
})
