'use client'

import { CloudRain, MessageCircleQuestion, Plug, Sun, Unplug, type LucideIcon } from 'lucide-react'
import { EVENTO_REFRESCAR } from '@/lib/modo'
import type { ResumenDemo } from '@/lib/demo/escenarios'

// Lo que la visita puede provocar en la demostración, con las mismas palabras
// en la hoja del celular y en el panel de la vista de presentación.

export type CualEscenario = 'secar' | 'llover' | 'sensor' | 'porque' | 'reiniciar'

export interface Escenario {
  id: Exclude<CualEscenario, 'reiniciar'>
  titulo: string
  detalle: string
  Icono: LucideIcon
}

/** Los escenarios, según cómo está el sistema ahora (el del sensor cambia). */
export function escenarios(sensorConectado: boolean): Escenario[] {
  return [
    {
      id: 'secar',
      titulo: 'Secar la tierra',
      detalle: 'Baja la humedad del punto de riego y mira cómo riega solo.',
      Icono: Sun,
    },
    {
      id: 'llover',
      titulo: 'Que llueva',
      detalle: 'Mira la lluvia en el cultivo y cómo se moja la tierra sin regar.',
      Icono: CloudRain,
    },
    sensorConectado
      ? { id: 'sensor', titulo: 'Desconectar el sensor', detalle: 'La app te avisa y no riega a ciegas.', Icono: Unplug }
      : { id: 'sensor', titulo: 'Volver a conectar el sensor', detalle: 'Regresan las lecturas y el riego sigue solo.', Icono: Plug },
    {
      id: 'porque',
      titulo: 'Preguntar por qué regó',
      detalle: 'El asistente lo explica con los números del cultivo.',
      Icono: MessageCircleQuestion,
    },
  ]
}

/** La pregunta que se hace sola al elegir "Preguntar por qué regó". */
export const PREGUNTA_PORQUE = '¿Por qué regó?'

/**
 * Corre un escenario en ESTA ventana (la que tiene la app). `navegar` lleva a
 * la pantalla donde se ve el efecto.
 */
export async function ejecutarEscenario(cual: CualEscenario, navegar: (ruta: string) => void): Promise<void> {
  const demo = await import('@/lib/demo')
  if (cual === 'reiniciar') {
    demo.reiniciarDemo()
    try {
      sessionStorage.removeItem('iondroplet.chat')
    } catch {}
    window.location.reload()
    return
  }
  if (cual === 'porque') {
    navegar(`/asistente?pregunta=${encodeURIComponent(PREGUNTA_PORQUE)}`)
    return
  }
  if (cual === 'llover') {
    // La lluvia se ve en la escena 3D del cultivo.
    demo.escenarioLlover()
    navegar('/cultivo')
    window.dispatchEvent(new Event(EVENTO_REFRESCAR))
    return
  }
  if (cual === 'secar') demo.escenarioSecar()
  else demo.escenarioSensor()
  navegar('/')
  window.dispatchEvent(new Event(EVENTO_REFRESCAR))
}

/** Lo que está pasando, en una línea: el panel lo va narrando en vivo. */
export function narrar(r: ResumenDemo): string {
  if (!r.sensor) return `Sin lecturas del sensor. La última fue ${r.humedad}%: el riego automático espera.`
  if (r.lloviendo && !r.regando) return `Está lloviendo: la tierra va en ${r.humedad}% y el riego no tiene que entrar.`
  if (r.regando) {
    return r.automatico
      ? `Regando solo: la tierra va en ${r.humedad}% y se detiene en cuanto pase de ${r.umbral}%.`
      : `Regando a mano: la tierra va en ${r.humedad}%.`
  }
  if (r.humedad < r.umbral) {
    return r.automatico
      ? `La tierra bajó a ${r.humedad}%, abajo del punto de riego. Empieza a regar solo.`
      : `La tierra bajó a ${r.humedad}% y el riego está en manual: no va a regar solo.`
  }
  return `La tierra está en ${r.humedad}%. Riega sola abajo de ${r.umbral}%.`
}

// --- Mensajes entre la vista de presentación y la app enmarcada ---

export interface MensajeEscenario {
  tipo: 'iondroplet:escenario'
  escenario: CualEscenario
}

export interface MensajeEstado {
  tipo: 'iondroplet:estado'
  resumen: ResumenDemo
}

export function esMensajeEscenario(datos: unknown): datos is MensajeEscenario {
  return typeof datos === 'object' && datos !== null && (datos as { tipo?: unknown }).tipo === 'iondroplet:escenario'
}

export function esMensajeEstado(datos: unknown): datos is MensajeEstado {
  return typeof datos === 'object' && datos !== null && (datos as { tipo?: unknown }).tipo === 'iondroplet:estado'
}
