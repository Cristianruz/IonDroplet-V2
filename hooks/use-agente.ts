'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch, parseTimestampUTC } from '@/lib/api'

// El agente agrónomo: lo que decidió, por qué, y el botón de deshacer.
//
// Que el agricultor VEA las decisiones no es un adorno. Un sistema que mueve
// el punto de riego sin que se note es un sistema en el que no se puede
// confiar. Aquí se ve qué cambió, con qué justificación y con qué confianza,
// y se puede regresar.

export interface Decision {
  id: number
  cuando: Date
  herramienta: string
  entrada: Record<string, unknown> | null
  justificacion: string | null
  confianza: number | null
  valor_antes: number | null
  valor_despues: number | null
  aplicada: boolean
  /** true si el modelo pidió más de lo permitido y el código lo recortó. */
  acotada: boolean
  revertida_en: string | null
  revertida_por: string | null
}

export interface LimitesAgente {
  RANGO: { min: number; max: number }
  DELTA_MAXIMO: number
  FRESCURA_MINIMA_MIN: number
  HORAS_ENTRE_CORRIDAS: number
}

export function useAgente() {
  const [decisiones, setDecisiones] = useState<Decision[]>([])
  const [habilitado, setHabilitado] = useState(true)
  const [limites, setLimites] = useState<LimitesAgente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [corriendo, setCorriendo] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const [dRes, eRes] = await Promise.all([
        apiFetch(`/api/agente/decisiones?limit=15`),
        apiFetch(`/api/agente/estado`),
      ])
      if (dRes.ok) {
        const filas = await dRes.json()
        setDecisiones(
          filas.map((f: Record<string, unknown>) => ({
            ...(f as unknown as Decision),
            cuando: parseTimestampUTC(f.cuando as string),
          }))
        )
      }
      if (eRes.ok) {
        const e = await eRes.json()
        setHabilitado(e.habilitado)
        setLimites(e.limites ?? null)
      }
    } catch {
      // Sin conexión no se enseña nada; la pantalla ya avisa aparte.
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const correr = useCallback(async () => {
    setCorriendo(true)
    try {
      await apiFetch(`/api/agente/correr`, { method: 'POST' })
      await cargar()
    } catch {
    } finally {
      setCorriendo(false)
    }
  }, [cargar])

  const deshacer = useCallback(
    async (id: number) => {
      try {
        const res = await apiFetch(`/api/agente/revertir/${id}`, { method: 'POST' })
        await cargar()
        return res.ok
      } catch {
        return false
      }
    },
    [cargar]
  )

  const cambiarHabilitado = useCallback(
    async (valor: boolean) => {
      try {
        await apiFetch(`/api/agente/habilitar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ habilitado: valor }),
        })
        setHabilitado(valor)
      } catch {}
    },
    []
  )

  return { decisiones, habilitado, limites, cargando, corriendo, correr, deshacer, cambiarHabilitado, recargar: cargar }
}
