'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch, parseTimestampUTC } from '@/lib/api'

// Las alertas las decide el servidor con reglas de código, no la IA: un aviso
// de helada no puede depender de que el modelo esté disponible. Aquí sólo se
// leen y se marcan.

export type Severidad = 'critica' | 'atencion' | 'informativa'
export type EstadoAlerta = 'nueva' | 'leida' | 'atendida' | 'descartada' | 'resuelta'

export interface Alerta {
  id: number
  regla: string
  severidad: Severidad
  titulo: string
  detalle: string | null
  /** El número que sostiene la alerta. Siempre se enseña. */
  dato: string | null
  accion: string | null
  estado: EstadoAlerta
  creada: Date
  atendida_en: Date | null
  atendida_por: string | null
}

export interface ResumenAlertas {
  sinVer: number
  porSeveridad: Record<Severidad, number>
}

function aAlerta(f: Record<string, unknown>): Alerta {
  return {
    ...(f as unknown as Alerta),
    creada: parseTimestampUTC(f.creada as string),
    atendida_en: f.atendida_en ? parseTimestampUTC(f.atendida_en as string) : null,
  }
}

/** Sólo el contador, para la campanita. Ligero: se puede pedir seguido. */
export function useResumenAlertas(intervaloMs = 60000) {
  const [resumen, setResumen] = useState<ResumenAlertas | null>(null)

  const cargar = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/alertas/resumen`)
      if (!res.ok) return
      setResumen(await res.json())
    } catch {
      // Sin conexión no se enseña contador. No es un error que valga la pena
      // ponerle al agricultor enfrente.
    }
  }, [])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, intervaloMs)
    return () => clearInterval(id)
  }, [cargar, intervaloMs])

  return { resumen, recargar: cargar }
}

export function useAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [cargando, setCargando] = useState(true)
  const [conectado, setConectado] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/alertas?limit=80`)
      if (!res.ok) throw new Error()
      const filas = await res.json()
      setAlertas(filas.map(aAlerta))
      setConectado(true)
    } catch {
      setConectado(false)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  /** Al abrir la pantalla, lo nuevo pasa a visto y la campanita se apaga. */
  const marcarVistas = useCallback(async () => {
    try {
      await apiFetch(`/api/alertas/vistas`, { method: 'POST' })
    } catch {}
  }, [])

  const cambiarEstado = useCallback(
    async (id: number, estado: EstadoAlerta): Promise<boolean> => {
      try {
        const res = await apiFetch(`/api/alertas/${id}/estado`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado }),
        })
        if (!res.ok) return false
        await cargar()
        return true
      } catch {
        return false
      }
    },
    [cargar]
  )

  return { alertas, cargando, conectado, cambiarEstado, marcarVistas, recargar: cargar }
}
