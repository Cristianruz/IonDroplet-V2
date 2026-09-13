'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch, parseTimestampUTC } from '@/lib/api'

// Lo que se le aplicó a la parcela. Captura a mano: no hay sonda de EC ni de
// pH, así que esos dos campos son opcionales y quien los llena es el
// agricultor con su medidor, si lo tiene.

export interface NutrienteAplicado {
  nutriente: string
  cantidad: number | null
  unidad: string | null
}

export interface Evento {
  id: number
  parcela_id: number | null
  aplicado: Date
  duracion_min: number | null
  volumen_litros: number | null
  ec_ds_m: number | null
  ph: number | null
  /** La etapa del cultivo EN EL MOMENTO de aplicar, congelada. */
  etapa: string | null
  operador: string | null
  notas: string | null
  nutrientes: NutrienteAplicado[]
}

export interface Resumen {
  dias: number
  porNutriente: Array<{ nutriente: string; unidad: string | null; total: number; eventos: number }>
  porEtapa: Array<{ etapa: string; eventos: number }>
  totales: {
    eventos: number
    litros: number | null
    ec_promedio: number | null
    ph_promedio: number | null
    sin_volumen: number
  }
}

export interface DatosAplicacion {
  duracion_min: number | null
  volumen_litros: number | null
  ec_ds_m: number | null
  ph: number | null
  notas: string | null
  nutrientes: Array<{ nutriente: string; cantidad: number | null; unidad: string }>
}

export function useFertirriego(dias = 90) {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [conectado, setConectado] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const [listaRes, resumenRes] = await Promise.all([
        apiFetch(`/api/fertirriego?limit=50`),
        apiFetch(`/api/fertirriego/resumen?dias=${dias}`),
      ])
      if (!listaRes.ok || !resumenRes.ok) throw new Error()

      const filas: Array<Omit<Evento, 'aplicado'> & { aplicado: string }> = await listaRes.json()
      setEventos(filas.map(f => ({ ...f, aplicado: parseTimestampUTC(f.aplicado) })))
      setResumen(await resumenRes.json())
      setConectado(true)
    } catch {
      setConectado(false)
    } finally {
      setCargando(false)
    }
  }, [dias])

  useEffect(() => {
    cargar()
  }, [cargar])

  /** Devuelve null si se guardó, o el motivo para enseñarlo tal cual. */
  const guardar = useCallback(
    async (datos: DatosAplicacion): Promise<string | null> => {
      setGuardando(true)
      try {
        const res = await apiFetch(`/api/fertirriego`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datos),
        })
        if (!res.ok) {
          const cuerpo = await res.json().catch(() => null)
          return cuerpo?.error ?? 'No se pudo guardar.'
        }
        await cargar()
        return null
      } catch {
        return 'No hay conexión con la computadora del riego.'
      } finally {
        setGuardando(false)
      }
    },
    [cargar]
  )

  const borrar = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        const res = await apiFetch(`/api/fertirriego/${id}`, { method: 'DELETE' })
        if (!res.ok) return false
        await cargar()
        return true
      } catch {
        return false
      }
    },
    [cargar]
  )

  return { eventos, resumen, cargando, guardando, conectado, guardar, borrar, recargar: cargar }
}
