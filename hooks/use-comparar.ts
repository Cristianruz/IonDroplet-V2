'use client'

import { useState, useEffect, useCallback } from 'react'
import { API_URL, parseTimestampUTC } from '@/lib/api'

// Comparación entre parcelas. Era el punto del jurado que estaba bloqueado por
// el estado de riego global: con una sola bomba para todo el sistema no había
// nada que comparar.
//
// Las series vienen ya submuestreadas del servidor, igual que el historial:
// son lecturas reales, una de cada N, nunca promedios.

export interface PuntoSerie {
  humedad: number
  fecha: Date
}

export interface SerieParcela {
  parcela_id: number
  nombre: string | null
  cultivo: string | null
  etapa: string | null
  lecturas_en_ventana: number
  puntos: PuntoSerie[]
  riego: { eventos: number; minutos: number }
}

export function useComparar(horas = 168, max = 200) {
  const [series, setSeries] = useState<SerieParcela[]>([])
  const [cargando, setCargando] = useState(true)
  const [conectado, setConectado] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/parcelas/comparar?hours=${horas}&max=${max}`)
      if (!res.ok) throw new Error()
      const datos = await res.json()
      setSeries(
        (datos.series ?? []).map((s: Record<string, unknown>) => ({
          ...(s as unknown as SerieParcela),
          puntos: ((s.puntos as Array<{ humidity: number; timestamp: string }>) ?? []).map(p => ({
            humedad: Number(p.humidity),
            fecha: parseTimestampUTC(p.timestamp),
          })),
        }))
      )
      setConectado(true)
    } catch {
      setConectado(false)
    } finally {
      setCargando(false)
    }
  }, [horas, max])

  useEffect(() => {
    cargar()
  }, [cargar])

  return { series, cargando, conectado, recargar: cargar }
}
