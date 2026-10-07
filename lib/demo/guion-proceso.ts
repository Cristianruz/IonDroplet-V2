// El guion del recorrido "Así riega IonDroplet" (/proceso).
//
// Es la explicación del sistema completo con la cámara siguiendo al agua: la
// tierra se seca, el sensor avisa, la computadora decide, el relé prende la
// bomba y las varillas que ionizan el agua del depósito, el agua recorre la
// tubería y cae gota a gota junto a la raíz, y cuando la tierra llega al punto
// de riego todo se apaga solo.
//
// Lo que se cuenta es lo que hace el sistema de verdad (el mismo relé mueve la
// bomba y las varillas, 12 V, el sensor manda por wifi, la computadora decide
// con el punto de riego). Lo que NO se dice es qué le hace la ionización a la
// planta: nada lo mide todavía (no hay sonda de ORP), así que no se promete.
//
// Una sola función del tiempo, como el guion del proyector: el mismo segundo
// da siempre el mismo cuadro. Sin React ni navegador: se prueba con node --test.

export type IdPaso =
  | 'inicio'
  | 'mide'
  | 'avisa'
  | 'decide'
  | 'ioniza'
  | 'bomba'
  | 'viaja'
  | 'gotea'
  | 'apaga'
  | 'final'

interface Paso {
  id: IdPaso
  segundos: number
  numero: number | null
  titulo: string
}

const PASOS: Paso[] = [
  { id: 'inicio', segundos: 6, numero: null, titulo: 'Así riega IonDroplet' },
  { id: 'mide', segundos: 7, numero: 1, titulo: 'Un sensor mide la tierra' },
  { id: 'avisa', segundos: 6, numero: 2, titulo: 'Avisa sin cables' },
  { id: 'decide', segundos: 8, numero: 3, titulo: 'Decide regar' },
  { id: 'ioniza', segundos: 11, numero: 4, titulo: 'El agua se ioniza' },
  { id: 'bomba', segundos: 6, numero: 5, titulo: 'La bomba la empuja' },
  { id: 'viaja', segundos: 9, numero: 6, titulo: 'Recorre la línea de goteo' },
  { id: 'gotea', segundos: 10, numero: 7, titulo: 'Gota a gota, junto a la raíz' },
  { id: 'apaga', segundos: 8, numero: 8, titulo: 'Llega al punto y se apaga solo' },
  { id: 'final', segundos: 9, numero: null, titulo: 'Agua exacta, en el momento exacto.' },
]

/** Una vuelta completa, en segundos. */
export const DURACION_PROCESO = PASOS.reduce((s, p) => s + p.segundos, 0)

/** Los pasos numerados, para los puntitos de avance. */
export const PASOS_NUMERADOS = PASOS.filter(p => p.numero !== null).length

/** El punto de riego del chile en llenado de fruto (el mismo que usa el agente). */
export const PUNTO_RIEGO = 55

// La humedad del cuento: arranca arriba, baja del punto, el riego la sube
// hasta el punto y el agua que ya iba bajando la deja 3 arriba.
const HUMEDAD_INICIO = 56.4
const HUMEDAD_BAJA = 54.6
const HUMEDAD_FINAL = 58

/** En qué momento del paso "decide" hace clic el relé. */
export const CLIC_RELE = 0.62
/** En qué momento del paso "apaga" se suelta el relé. */
export const SUELTA_RELE = 0.35

const suave = (p: number) => p * p * (3 - 2 * p)
const entre = (a: number, b: number, p: number) => a + (b - a) * p
const decimal = (n: number) => Math.round(n * 10) / 10

export interface MomentoProceso {
  paso: IdPaso
  indice: number
  numero: number | null
  /** Avance dentro del paso, 0 a 1. */
  avance: number
  /** Cuánto dura este paso, en segundos. */
  duracion: number
  /** Segundo dentro de la vuelta. */
  segundo: number
  titulo: string
  detalle: string
  /** Lectura del sensor, con un decimal. */
  humedad: number
  /** El relé prende a la vez la bomba y las varillas: una sola acción. */
  rele: boolean
  /**
   * Hasta dónde llegó el agua por la tubería, de 0 (sigue en el depósito) a 1
   * (en el gotero de la planta del frente).
   */
  frente: number
  /** Cuánto se ha mojado la tierra junto a la raíz, 0 a 1. */
  mojado: number
}

function ubicar(segundo: number): { indice: number; avance: number; t: number } {
  const vuelta = Math.floor(segundo / DURACION_PROCESO)
  let t = segundo - vuelta * DURACION_PROCESO
  const enVuelta = t
  for (let i = 0; i < PASOS.length; i++) {
    if (t < PASOS[i].segundos) return { indice: i, avance: t / PASOS[i].segundos, t: enVuelta }
    t -= PASOS[i].segundos
  }
  return { indice: PASOS.length - 1, avance: 1, t: enVuelta }
}

/** El segundo en que empieza el paso siguiente (o el anterior), dentro de la misma escala. */
export function saltarPaso(segundo: number, direccion: 1 | -1): number {
  const { indice, t } = ubicar(segundo)
  const base = segundo - t
  let inicio = base
  for (let i = 0; i < indice; i++) inicio += PASOS[i].segundos
  if (direccion === 1) return inicio + PASOS[indice].segundos
  if (t - (inicio - base) > 1.5) return inicio
  return indice > 0 ? inicio - PASOS[indice - 1].segundos : inicio - PASOS[PASOS.length - 1].segundos
}

export function momentoProceso(segundo: number): MomentoProceso {
  const { indice, avance: p, t } = ubicar(segundo)
  const paso = PASOS[indice]
  const id = paso.id

  // Humedad
  let h = HUMEDAD_INICIO
  if (id === 'mide') h = entre(HUMEDAD_INICIO, HUMEDAD_BAJA, suave(p))
  else if (['avisa', 'decide', 'ioniza', 'bomba', 'viaja'].includes(id)) h = HUMEDAD_BAJA
  // El agua llega a la raíz y el sensor lo nota: sube hasta casi el punto.
  else if (id === 'gotea') h = entre(HUMEDAD_BAJA, PUNTO_RIEGO - 0.1, suave(Math.max(0, (p - 0.35) / 0.65)))
  // Se apaga en el momento en que la lectura llega al punto, ni antes ni después.
  else if (id === 'apaga') h = p < SUELTA_RELE ? PUNTO_RIEGO - 0.1 : entre(PUNTO_RIEGO, HUMEDAD_FINAL, suave((p - SUELTA_RELE) / (1 - SUELTA_RELE)))
  else if (id === 'final') h = HUMEDAD_FINAL
  const humedad = decimal(h)

  // El relé: entra cuando la computadora decide y se suelta al llegar al punto.
  const orden = ['decide', 'ioniza', 'bomba', 'viaja', 'gotea', 'apaga'].indexOf(id)
  const rele =
    (id === 'decide' && p >= CLIC_RELE) ||
    (orden >= 1 && orden <= 4) ||
    (id === 'apaga' && p < SUELTA_RELE)

  // El agua por la tubería
  let frente = 0
  if (id === 'ioniza') frente = 0.1 * suave(Math.max(0, (p - 0.55) / 0.45))
  else if (id === 'bomba') frente = entre(0.1, 0.32, p)
  else if (id === 'viaja') frente = entre(0.32, 1, p)
  else if (id === 'gotea' || id === 'apaga' || id === 'final') frente = 1
  // Al soltarse el relé el agua deja de correr: la tubería se queda llena.

  let mojado = 0
  if (id === 'gotea') mojado = suave(p)
  else if (id === 'apaga' || id === 'final') mojado = 1

  const hum = humedad.toFixed(1)
  let detalle = ''
  switch (id) {
    case 'inicio':
      detalle = 'Sigue el agua: del depósito hasta la raíz.'
      break
    case 'mide':
      detalle = `Va en ${hum}%. Este chile pide riego abajo de ${PUNTO_RIEGO}%.`
      break
    case 'avisa':
      detalle = 'Manda la lectura por wifi a la caja de control, cada pocos segundos.'
      break
    case 'decide':
      detalle = p < CLIC_RELE
        ? `${hum}% es menos que ${PUNTO_RIEGO}%: la computadora da la orden de regar.`
        : 'Clic: el relé se cierra. Nadie tuvo que ir a prender nada.'
      break
    case 'ioniza':
      detalle = 'El mismo relé prende la bomba y dos varillas con 12 V dentro del depósito. El agua sale ionizada.'
      break
    case 'bomba':
      detalle = 'La saca del depósito y la manda a la tubería principal.'
      break
    case 'viaja':
      detalle = 'Corre por la manguera hasta cada planta de la hilera.'
      break
    case 'gotea':
      detalle = `El gotero la deja junto a la raíz y la tierra se moja. El sensor ya marca ${hum}%.`
      break
    case 'apaga':
      detalle = p < SUELTA_RELE
        ? `Ya va en ${hum}%. En cuanto llegue a ${PUNTO_RIEGO}% se apaga.`
        : `Llegó a ${PUNTO_RIEGO}%: se apagaron la bomba y las varillas. El agua que ya iba bajando deja la tierra en ${hum}%.`
      break
    case 'final':
      detalle = 'Pruébala en tu celular.'
      break
  }

  return {
    paso: id,
    indice,
    numero: paso.numero,
    avance: p,
    duracion: paso.segundos,
    segundo: t,
    titulo: paso.titulo,
    detalle,
    humedad,
    rele,
    frente,
    mojado,
  }
}
