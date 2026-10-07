// El clima real de Chihuahua, pedido por el servidor de la demostración.
//
// Se guarda 10 minutos en memoria: todos los celulares que abran la
// demostración en ese rato comparten la misma consulta a Open-Meteo, y la IA
// lee exactamente el mismo pronóstico que ve la pantalla.

import { LUGAR_DEMO, climaValido, urlOpenMeteo, type ClimaReal } from '../demo/clima-real.ts'

const VIGENCIA_MS = 10 * 60 * 1000
/** Si Open-Meteo no contesta, una consulta de hace unas horas sigue siendo real (y dice de cuándo es). */
const VIEJO_PERO_UTIL_MS = 6 * 60 * 60 * 1000

let guardado: { cuando: number; datos: ClimaReal } | null = null
let enCamino: Promise<ClimaReal | null> | null = null

async function consultar(): Promise<ClimaReal | null> {
  try {
    const res = await fetch(urlOpenMeteo(), { signal: AbortSignal.timeout(8000), cache: 'no-store' })
    if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`)
    const crudo = await res.json()
    const datos = {
      lugar: LUGAR_DEMO.nombre,
      latitud: LUGAR_DEMO.latitud,
      longitud: LUGAR_DEMO.longitud,
      consultado: new Date().toISOString(),
      current: crudo.current,
      hourly: crudo.hourly,
      daily: crudo.daily,
    }
    if (!climaValido(datos)) throw new Error('Open-Meteo mandó una respuesta incompleta')
    guardado = { cuando: Date.now(), datos }
    return datos
  } catch (err) {
    console.error('Clima de la demostración:', err instanceof Error ? err.message : err)
    return guardado && Date.now() - guardado.cuando < VIEJO_PERO_UTIL_MS ? guardado.datos : null
  }
}

export async function pedirClimaReal(): Promise<ClimaReal | null> {
  if (guardado && Date.now() - guardado.cuando < VIGENCIA_MS) return guardado.datos
  // Si diez celulares preguntan a la vez, sale una sola consulta.
  enCamino ??= consultar().finally(() => {
    enCamino = null
  })
  return enCamino
}
