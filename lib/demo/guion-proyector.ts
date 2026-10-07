// El guion de la pantalla del proyector (/proyector).
//
// En el evento la demostración se queda corriendo sola atrás de quien
// presenta. Nadie la toca, así que no puede esperar a que alguien provoque un
// escenario: cuenta siempre la misma historia, en bucle, con el tiempo
// acelerado. La tierra se seca con el sol de la tarde, baja del punto de
// riego, el sistema riega solo, se detiene y explica por qué. Luego llueve o
// falla el sensor. Cierra con el código para que cada quien lo pruebe en su
// celular, y empieza otra vez con otro cultivo y otro sistema de riego.
//
// Las reglas son las del backend y de la simulación (simulacion.ts): riega en
// cuanto la lectura baja del punto de riego y se detiene en cuanto llega a él;
// sin lecturas no decide; con lluvia la tierra sube sola. Los números son de
// ejemplo y la pantalla lo dice siempre.
//
// Todo sale de una sola función del tiempo: el mismo segundo da siempre el
// mismo cuadro. Así se puede pausar, adelantar y probar con node --test.

import { puntoIdeal } from './simulacion.ts'

export type IdCapitulo =
  | 'mide'
  | 'seca'
  | 'decide'
  | 'riega'
  | 'detiene'
  | 'explica'
  | 'llueve'
  | 'sin-sensor'
  | 'vuelve'
  | 'pruebala'

export type SistemaRiego = 'goteo' | 'aspersion' | 'gravedad'

interface Ciclo {
  cultivo: string
  nombre: string
  sistema: SistemaRiego
  nombreSistema: string
  /** La fase que sabe dibujar la escena 3D. */
  fase: string
  /** La etapa del cultivo con la que se busca su punto de riego. */
  etapa: string
  /** Lo que pasa después de explicar: llueve, o se desconecta el sensor. */
  despues: 'llueve' | 'sensor'
}

// Tres cultivos de Chihuahua con el riego que de veras se les pone.
const CICLOS: Ciclo[] = [
  {
    cultivo: 'nogal',
    nombre: 'Nogal pecanero',
    sistema: 'aspersion',
    nombreSistema: 'microaspersión',
    fase: 'fruto',
    etapa: 'llenado_almendra',
    despues: 'llueve',
  },
  {
    cultivo: 'chile',
    nombre: 'Chile',
    sistema: 'goteo',
    nombreSistema: 'goteo',
    fase: 'fruto',
    etapa: 'fruto',
    despues: 'llueve',
  },
  {
    cultivo: 'maiz',
    nombre: 'Maíz',
    sistema: 'gravedad',
    nombreSistema: 'riego por surco',
    fase: 'crecimiento',
    etapa: 'crecimiento',
    despues: 'sensor',
  },
]

interface Paso {
  id: IdCapitulo
  segundos: number
}

function pasosDe(c: Ciclo): Paso[] {
  const comunes: Paso[] = [
    { id: 'mide', segundos: 8 },
    { id: 'seca', segundos: 13 },
    { id: 'decide', segundos: 4 },
    // El riego y la lluvia son lo que más se tiene que ver: van más largos.
    { id: 'riega', segundos: 18 },
    { id: 'detiene', segundos: 6 },
    { id: 'explica', segundos: 13 },
  ]
  const final: Paso = { id: 'pruebala', segundos: 9 }
  return c.despues === 'llueve'
    ? [...comunes, { id: 'llueve', segundos: 18 }, final]
    : [...comunes, { id: 'sin-sensor', segundos: 11 }, { id: 'vuelve', segundos: 5 }, final]
}

const PASOS = CICLOS.map(pasosDe)
const DURACION_CICLO = PASOS.map(lista => lista.reduce((s, p) => s + p.segundos, 0))
/** Una vuelta completa a los tres cultivos, en segundos. */
export const DURACION_BUCLE = DURACION_CICLO.reduce((s, d) => s + d, 0)

/** Cuántos capítulos tiene cada ciclo (para los puntitos de avance). */
export function capitulosDelCiclo(ciclo: number): IdCapitulo[] {
  return PASOS[ciclo % CICLOS.length].map(p => p.id)
}

// --- Cómo va la tierra en cada capítulo, en puntos sobre el punto de riego ---
//
// Las lecturas llevan un decimal, como las que guarda la simulación: de lejos
// se ve que el número se mueve. La tierra arranca 10 arriba y se seca hasta
// quedar justo en el punto (no abajo: abajo ya estaría regando). La siguiente
// lectura sale abajo y riega. Sube hasta llegar al punto y se apaga; el agua
// que ya iba bajando la deja 3 puntos arriba, como en la historia simulada.
const ARRIBA_AL_EMPEZAR = 10
const BAJA_HASTA = 1.4
const DESPUES_DE_REGAR = 3
const SUBE_CON_LLUVIA = 7
/** Un aguacero de verano: con esto la escena llueve a toda su intensidad. */
const LLUVIA_FUERTE_MM_HORA = 8

const decimal = (n: number) => Math.round(n * 10) / 10
/** "57.4": las cifras de la pantalla, con un decimal. */
export const textoHumedad = (n: number) => n.toFixed(1)

const suave = (p: number) => p * p * (3 - 2 * p)
const entre = (a: number, b: number, p: number) => a + (b - a) * p

export interface Momento {
  ciclo: number
  cultivo: string
  nombreCultivo: string
  sistema: SistemaRiego
  nombreSistema: string
  fase: string
  umbral: number
  /** Lectura del sensor, con un decimal. Sin sensor es la última que llegó. */
  humedad: number
  /** La más baja de este ciclo: la que hizo regar. */
  humedadMinima: number
  regando: boolean
  sensor: boolean
  /** Lluvia de este momento en mm/h (0 si no llueve). */
  lluvia: number
  /** Código WMO del cielo: 0 despejado, 2 medio nublado, 3 nublado, 61 lluvia. */
  codigo: number
  /** Hora del día simulada, decimal. */
  hora: number
  capitulo: IdCapitulo
  /** Índice del capítulo dentro del ciclo. */
  indice: number
  /** Avance dentro del capítulo, 0 a 1. */
  avance: number
  titulo: string
  detalle: string
  /** Solo en "explica": la respuesta del sistema a "¿Por qué regó?". */
  respuesta: string | null
  /** Segundo del bucle en que empieza el ciclo actual (para reiniciar la escena). */
  inicioCiclo: number
}

/** Dónde cae un segundo cualquiera: qué ciclo, qué capítulo y cuánto lleva. */
function ubicar(segundo: number): { ciclo: number; indice: number; avance: number; inicioCiclo: number } {
  // El inicio se arma con enteros (vueltas y duraciones): restándole al
  // segundo lo que lleva saldría con basura de decimales distinta en cada
  // cuadro, y la pantalla lo usa como llave para rearmar la escena.
  const vuelta = Math.floor(segundo / DURACION_BUCLE)
  let t = segundo - vuelta * DURACION_BUCLE
  let inicio = vuelta * DURACION_BUCLE
  for (let c = 0; c < CICLOS.length; c++) {
    if (t < DURACION_CICLO[c]) {
      for (let i = 0; i < PASOS[c].length; i++) {
        const dur = PASOS[c][i].segundos
        if (t < dur) return { ciclo: c, indice: i, avance: t / dur, inicioCiclo: inicio }
        t -= dur
      }
    }
    t -= DURACION_CICLO[c]
    inicio += DURACION_CICLO[c]
  }
  return { ciclo: 0, indice: 0, avance: 0, inicioCiclo: inicio }
}

/** El segundo del bucle en que empieza el capítulo siguiente (o el anterior). */
export function saltarCapitulo(segundo: number, direccion: 1 | -1): number {
  const { ciclo, indice, inicioCiclo } = ubicar(segundo)
  let inicio = inicioCiclo
  for (let i = 0; i < indice; i++) inicio += PASOS[ciclo][i].segundos
  if (direccion === 1) return inicio + PASOS[ciclo][indice].segundos
  // Hacia atrás: al principio del capítulo actual, o al anterior si ya estaba ahí.
  if (segundo - inicio > 1.5) return inicio
  if (indice > 0) return inicio - PASOS[ciclo][indice - 1].segundos
  const anterior = (ciclo + CICLOS.length - 1) % CICLOS.length
  return inicio - PASOS[anterior][PASOS[anterior].length - 1].segundos
}

export function momento(segundo: number): Momento {
  const { ciclo, indice, avance: p, inicioCiclo } = ubicar(segundo)
  const c = CICLOS[ciclo]
  const capitulo = PASOS[ciclo][indice].id
  const u = puntoIdeal(c.cultivo, c.etapa)

  const minima = u - BAJA_HASTA
  let h = u + ARRIBA_AL_EMPEZAR
  let hora = 9
  let sensor = true
  let lluvia = 0
  let codigo = 0
  let titulo = ''
  let detalle = ''
  let respuesta: string | null = null

  switch (capitulo) {
    case 'mide':
      h = u + ARRIBA_AL_EMPEZAR - 0.8 * p
      hora = entre(8.5, 10, p)
      break
    case 'seca':
      // Más rápido conforme pega el sol de la tarde. Termina justo en el
      // punto: todavía no es "abajo", así que todavía no riega.
      h = u + (ARRIBA_AL_EMPEZAR - 0.8) * (1 - Math.pow(p, 1.6))
      hora = entre(10, 15, p)
      break
    case 'decide':
      // La lectura siguiente ya sale abajo del punto.
      h = u - 0.3 - (BAJA_HASTA - 0.3) * suave(Math.min(1, p / 0.5))
      hora = entre(15, 15.15, p)
      break
    case 'riega':
      // Sube hasta llegar al punto de riego. Ahí se apaga (capítulo siguiente).
      h = minima + BAJA_HASTA * p * 0.99
      hora = entre(15.15, 15.6, p)
      break
    case 'detiene':
      h = u + DESPUES_DE_REGAR * suave(Math.min(1, p * 1.4))
      hora = entre(15.6, 15.75, p)
      break
    case 'explica':
      h = u + DESPUES_DE_REGAR
      hora = entre(15.75, 16.4, p)
      respuesta =
        `Regué porque la tierra bajó a ${textoHumedad(minima)}%, abajo de tu punto de riego de ${u}%. ` +
        `Me detuve en cuanto llegó a ${u}% y ahora va en ${textoHumedad(u + DESPUES_DE_REGAR)}%.`
      break
    case 'llueve': {
      // Primero se nubla, luego llueve y la tierra sube sola.
      const llueve = p > 0.14
      const q = llueve ? (p - 0.14) / 0.86 : 0
      h = u + DESPUES_DE_REGAR + SUBE_CON_LLUVIA * suave(q)
      hora = entre(16.4, 17.6, p)
      codigo = llueve ? 61 : 3
      lluvia = llueve ? LLUVIA_FUERTE_MM_HORA : 0
      break
    }
    case 'sin-sensor':
      h = u + DESPUES_DE_REGAR
      hora = entre(16.4, 17.1, p)
      sensor = false
      codigo = 2
      break
    case 'vuelve':
      h = u + DESPUES_DE_REGAR
      hora = entre(17.1, 17.4, p)
      codigo = 2
      break
    case 'pruebala':
      // La tierra se queda como la dejó lo anterior; el cielo se despeja.
      h = u + DESPUES_DE_REGAR + (c.despues === 'llueve' ? SUBE_CON_LLUVIA : 0)
      hora = entre(17.6, 17.9, p)
      codigo = 2
      break
  }

  const humedad = decimal(h)
  // La misma regla del backend: riega mientras la lectura esté abajo del
  // punto, y sin lecturas no decide.
  const regando = sensor && lluvia === 0 && humedad < u
  const hum = textoHumedad(humedad)

  switch (capitulo) {
    case 'mide':
      titulo = 'Un sensor mide la tierra.'
      detalle = `Va en ${hum}%. Riega solo cuando baje de ${u}%, el punto de riego de este cultivo.`
      break
    case 'seca':
      titulo = 'Con el sol de la tarde, se seca.'
      detalle = `Ya va en ${hum}%. Todavía no hace falta regar: el punto es ${u}%.`
      break
    case 'decide':
      titulo = 'Bajó del punto de riego.'
      detalle = `${hum}% es menos que ${u}%. Empieza a regar solo, sin que nadie lo prenda.`
      break
    case 'riega':
      titulo = 'Entra el agua.'
      detalle = `La tierra va en ${hum}% y se detiene en cuanto llegue a ${u}%.`
      break
    case 'detiene':
      titulo = 'Llegó al punto y se detuvo.'
      detalle = `Apagó la bomba en ${u}%. El agua que ya iba bajando deja la tierra en ${hum}%.`
      break
    case 'explica':
      titulo = 'Pregúntale por qué regó.'
      detalle = 'Le preguntas en el celular y te contesta con los números de tu cultivo.'
      break
    case 'llueve':
      titulo = codigo === 3 ? 'Se nubla.' : 'Si llueve, no riega.'
      detalle = codigo === 3
        ? `La tierra va en ${hum}%, arriba del punto de riego.`
        : `La lluvia sube la tierra a ${hum}% y el riego no tiene que entrar.`
      break
    case 'sin-sensor':
      titulo = 'Si el sensor falla, te avisa.'
      detalle = `Sin lecturas no riega a ciegas. La última que llegó fue ${hum}%.`
      break
    case 'vuelve':
      titulo = 'Volvió el sensor.'
      detalle = 'Regresan las lecturas y el riego sigue solo.'
      break
    case 'pruebala':
      titulo = 'Ahora pruébala tú.'
      detalle = 'Escanea el código: en tu celular puedes secar la tierra, hacer que llueva y preguntarle por qué regó.'
      break
  }

  return {
    ciclo,
    cultivo: c.cultivo,
    nombreCultivo: c.nombre,
    sistema: c.sistema,
    nombreSistema: c.nombreSistema,
    fase: c.fase,
    umbral: u,
    humedad,
    humedadMinima: minima,
    regando,
    sensor,
    lluvia,
    codigo,
    hora,
    capitulo,
    indice,
    avance: p,
    titulo,
    detalle,
    respuesta,
    inicioCiclo,
  }
}

/** "15:20" a partir de una hora decimal. */
export function textoHora(hora: number): string {
  const total = Math.floor(hora * 60)
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${h}:${String(m).padStart(2, '0')}`
}
