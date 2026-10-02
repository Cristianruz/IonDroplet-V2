// Lo que la visita puede provocar en la demostración para ver al sistema
// trabajar. Sin esto la tierra se seca un punto por hora y en un minuto de
// visita no pasa nada: el jurado vería un número quieto.
//
// Cada escenario cambia el estado simulado y nada más. Lo que pasa después
// (el riego que entra solo, el aviso del sensor) lo decide la misma
// simulación que corre siempre, con las mismas reglas que el backend.
//
// Sin React ni navegador: se prueba con node --test.

import {
  MIN,
  PISO_HUMEDAD,
  apagarBomba,
  avanzar,
  humedadActual,
  lloviendo,
  redondear,
  registrar,
  sensorMudo,
  sqlTs,
  ultimaLectura,
  type Estado,
} from './simulacion.ts'

export type Escenario = 'secar' | 'sensor' | 'porque' | 'llover'

/** Cuánto queda la tierra abajo del punto de riego al secarla: el riego dura unos 25 segundos. */
const BAJO_EL_PUNTO = 7
/** El sensor "se desconectó" hace este rato: ya cuenta como sin lecturas. */
const MUDO_HACE = 6 * MIN

/**
 * La tierra queda unos puntos abajo del punto de riego, con el riego en
 * automático. En la siguiente vuelta de la simulación la bomba entra sola.
 */
export function secarTierra(e: Estado, ahora: number): void {
  avanzar(e, ahora)
  if (sensorMudo(e)) reconectarSensor(e, ahora)
  if (e.bomba) apagarBomba(e, ahora)
  if (!e.auto) {
    e.auto = true
    registrar(e, {
      tipo: 'modo',
      detalle: 'Cambió a riego automático',
      origen: 'usuario',
      parcela_id: 1,
      t: ahora,
      duracion_seg: null,
    })
  }
  const h = Math.max(PISO_HUMEDAD + 2, e.umbral - BAJO_EL_PUNTO)
  e.h[1] = h
  e.lecturas[1].push({ t: ahora, h: redondear(h) })
  e.ultimaGuardada = ahora
}

/**
 * El sensor deja de mandar lecturas desde hace unos minutos: las que habría
 * mandado en ese rato se quitan y la bomba, si regaba sola, se apaga porque
 * el automático ya no sabe cómo está la tierra.
 */
export function desconectarSensor(e: Estado, ahora: number): void {
  avanzar(e, ahora)
  if (sensorMudo(e)) return
  const desde = ahora - MUDO_HACE
  // La última lectura que "llegó" es la de hace unos minutos, con la humedad
  // que la visita estaba viendo: así el número no brinca al desconectar.
  e.lecturas[1] = e.lecturas[1].filter(l => l.t < desde)
  e.lecturas[1].push({ t: desde, h: redondear(e.h[1]) })
  e.sensorMudoDesde = desde
  if (e.bomba && e.auto) apagarBomba(e, ahora)

  const ultima = ultimaLectura(e)
  const p = e.parcelas.find(x => x.id === 1)
  e.alertas = e.alertas.filter(a => !(a.regla === 'sensor_mudo' && a.estado === 'nueva'))
  e.alertas.push({
    id: e.alertas.reduce((m, a) => Math.max(m, a.id), 0) + 1,
    parcela_id: 1,
    regla: 'sensor_mudo',
    clave: 'sensor_mudo',
    severidad: 'critica',
    titulo: 'El sensor dejó de reportar',
    detalle: `${p?.nombre ?? 'El cultivo'} no ha mandado lecturas en unos minutos. Mientras tanto el riego automático no puede decidir solo.`,
    dato: ultima ? `Última lectura: ${Math.round(ultima.h)}%.` : 'No hay lecturas recientes.',
    accion: 'Revisa el cable, la corriente y la conexión del aparato del campo.',
    estado: 'nueva',
    creada: sqlTs(ahora),
    atendida_en: null,
    atendida_por: null,
  })
}

/** Tres minutos de lluvia: la tierra se moja sola y el riego no hace falta. */
export const DURACION_LLUVIA = 3 * MIN

export function llover(e: Estado, ahora: number): void {
  avanzar(e, ahora)
  e.lluviaHasta = ahora + DURACION_LLUVIA
}

/** Las lecturas vuelven y el automático vuelve a decidir. */
export function reconectarSensor(e: Estado, ahora: number): void {
  avanzar(e, ahora)
  if (!sensorMudo(e)) return
  e.sensorMudoDesde = null
  e.lecturas[1].push({ t: ahora, h: redondear(e.h[1]) })
  e.ultimaGuardada = ahora
  for (const a of e.alertas) {
    if (a.regla === 'sensor_mudo' && (a.estado === 'nueva' || a.estado === 'leida')) a.estado = 'resuelta'
  }
}

/** Lo que el panel de presentación cuenta del celular, en una línea. */
export interface ResumenDemo {
  humedad: number
  /** El punto de riego: abajo de él riega solo, y en cuanto lo pasa se detiene. */
  umbral: number
  regando: boolean
  automatico: boolean
  sensor: boolean
  lloviendo: boolean
}

export function resumen(e: Estado): ResumenDemo {
  return {
    humedad: sensorMudo(e) ? Math.round(ultimaLectura(e)?.h ?? e.h[1]) : humedadActual(e),
    umbral: e.umbral,
    regando: e.bomba === 1,
    automatico: e.auto,
    sensor: !sensorMudo(e),
    lloviendo: lloviendo(e, e.t),
  }
}
