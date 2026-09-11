'use client'

import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '@/lib/api'

// Cuánto cuesta subir un punto de humedad.
//
// La mitad que funciona hoy son los MINUTOS por punto: se miden con la
// duración del riego y las lecturas de antes y después. La otra mitad, los
// litros, espera el caudal de la bomba; mientras no esté, viene en null y se
// dice qué falta — no se estima.

export interface EventoEficiencia {
  id: number
  cuando: string
  minutos: number
  humedad_antes: number | null
  humedad_despues: number | null
  puntos_ganados: number | null
  minutos_por_punto: number | null
  litros: number | null
  litros_por_punto: number | null
}

export interface Eficiencia {
  parcela: { id: number; nombre: string | null; caudal_lpm: number | null }
  dias: number
  eventos: EventoEficiencia[]
  referencia_min_por_punto: number | null
  ultimo_min_por_punto: number | null
  /** Positivo = está costando más que lo normal. */
  desviacion_pct: number | null
  faltantes: Array<{ dato: string; porque: string }>
}

export function useEficiencia(dias = 90) {
  const [datos, setDatos] = useState<Eficiencia | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/riego/eficiencia?dias=${dias}`)
      if (!res.ok) return
      setDatos(await res.json())
    } catch {
      // Sin conexión no se enseña nada; la pantalla ya avisa aparte.
    } finally {
      setCargando(false)
    }
  }, [dias])

  useEffect(() => {
    cargar()
  }, [cargar])

  return { datos, cargando, recargar: cargar }
}
