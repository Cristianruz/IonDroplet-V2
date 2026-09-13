'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch, parseTimestampUTC } from '@/lib/api'
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
  const [cargando, setCargando] = useState(true)
  const [conectado, setConectado] = useState(false)

  const horas = RANGOS.find(r => r.id === rango)?.horas ?? 24

  const cargar = useCallback(async () => {
    try {
      // La bitácora no se pide aquí: los riegos para la gráfica salen de la
      // misma respuesta que ya trae useRegistro.
      const [res, resResumen, resSensores] = await Promise.all([
        // El servidor manda la muestra ya reducida: un día de operación son
        // más de 23,000 lecturas y la gráfica dibuja unos cientos.
        apiFetch(`/api/sensors/history?hours=${horas}&max=${MAXIMO_PUNTOS}`),
        apiFetch(`/api/logs/resumen?hours=${horas}`),
        // El promedio se saca aparte, sobre todas las lecturas, no sobre la muestra.
        apiFetch(`/api/sensors/resumen?hours=${horas}`),
      ])
      if (!res.ok) throw new Error()
      const filas: Array<{ humidity: number | null; timestamp: string }> = await res.json()
      setResumen(resResumen.ok ? await resResumen.json() : null)

      if (resSensores.ok) {
        const cifras: { lecturas: number; promedio: number | null } = await resSensores.json()
        setTotalLecturas(cifras.lecturas)
        setPromedio(cifras.promedio)
      } else {
        setTotalLecturas(0)
        setPromedio(null)
      }


      const limpias = filas
        .filter(f => f.humidity !== null && f.humidity !== undefined)
        .map(f => ({ humedad: Number(f.humidity), fecha: parseTimestampUTC(f.timestamp) }))

      // El servidor ya mandó la muestra; aligerar aquí es solo un seguro por
      // si algún día responde de más.
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

  return { puntos, totalLecturas, promedio, resumen, cargando, conectado, horas }
}
