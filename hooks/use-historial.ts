'use client'

import { useState, useEffect, useCallback } from 'react'
import { API_URL, parseTimestampUTC } from '@/lib/api'
import type { PuntoHistorial } from './use-iondroplet'

export type RangoHistorial = 'hoy' | '7dias' | '30dias'

export const RANGOS: Array<{ id: RangoHistorial; etiqueta: string; horas: number }> = [
  { id: 'hoy', etiqueta: 'Hoy', horas: 24 },
  { id: '7dias', etiqueta: '7 días', horas: 168 },
  { id: '30dias', etiqueta: '30 días', horas: 720 },
]

// El sensor manda una lectura cada pocos segundos: 30 días son decenas de miles
// de puntos y la gráfica no los distingue. Se toma una de cada N — son lecturas
// reales, no un promedio inventado.
const MAXIMO_PUNTOS = 720

function aligerar(puntos: PuntoHistorial[]): PuntoHistorial[] {
  if (puntos.length <= MAXIMO_PUNTOS) return puntos
  const paso = Math.ceil(puntos.length / MAXIMO_PUNTOS)
  const salida = puntos.filter((_, i) => i % paso === 0)
  // El último punto siempre se conserva: es el dato de ahorita.
  const ultimo = puntos[puntos.length - 1]
  if (salida[salida.length - 1] !== ultimo) salida.push(ultimo)
  return salida
}

export interface ResumenRiegos {
  riegos: number
  segundos_agua: number
  /** Riegos que empezaron y nunca se cerraron: su tiempo no está contado. */
  sin_duracion: number
}

export function useHistorial(rango: RangoHistorial, intervaloMs = 60000) {
  const [puntos, setPuntos] = useState<PuntoHistorial[]>([])
  const [totalLecturas, setTotalLecturas] = useState(0)
  const [promedio, setPromedio] = useState<number | null>(null)
  const [resumen, setResumen] = useState<ResumenRiegos | null>(null)
  const [riegos, setRiegos] = useState<Date[]>([])
  const [cargando, setCargando] = useState(true)
  const [conectado, setConectado] = useState(false)

  const horas = RANGOS.find(r => r.id === rango)?.horas ?? 24

  const cargar = useCallback(async () => {
    try {
      const [res, resResumen, resRiegos] = await Promise.all([
        fetch(`${API_URL}/api/sensors/history?hours=${horas}`),
        fetch(`${API_URL}/api/logs/resumen?hours=${horas}`),
        fetch(`${API_URL}/api/logs?hours=${horas}&limit=200`),
      ])
      if (!res.ok) throw new Error()
      const filas: Array<{ humidity: number | null; timestamp: string }> = await res.json()
      setResumen(resResumen.ok ? await resResumen.json() : null)

      // Cuándo empezó cada riego, para marcarlo en la gráfica.
      if (resRiegos.ok) {
        const acciones: Array<{ tipo: string; timestamp: string }> = await resRiegos.json()
        setRiegos(
          acciones.filter(a => a.tipo === 'riego').map(a => parseTimestampUTC(a.timestamp))
        )
      } else {
        setRiegos([])
      }

      const limpias = filas
        .filter(f => f.humidity !== null && f.humidity !== undefined)
        .map(f => ({ humedad: Number(f.humidity), fecha: parseTimestampUTC(f.timestamp) }))

      setTotalLecturas(limpias.length)
      // El promedio se calcula sobre TODAS las lecturas, no sobre las aligeradas.
      setPromedio(
        limpias.length > 0
          ? limpias.reduce((suma, p) => suma + p.humedad, 0) / limpias.length
          : null
      )
      setPuntos(aligerar(limpias))
      setConectado(true)
    } catch {
      setConectado(false)
    } finally {
      setCargando(false)
    }
  }, [horas])

  useEffect(() => {
    setCargando(true)
    cargar()
    const id = setInterval(cargar, intervaloMs)
    return () => clearInterval(id)
  }, [cargar, intervaloMs])

  return { puntos, totalLecturas, promedio, resumen, riegos, cargando, conectado, horas }
}
