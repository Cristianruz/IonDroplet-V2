'use client'

import { useState, useEffect, useCallback } from 'react'
import { API_URL, parseTimestampUTC } from '@/lib/api'

export type OrigenAccion = 'usuario' | 'ia' | 'umbral'

export interface Accion {
  id: number
  tipo: string
  detalle: string | null
  origen: OrigenAccion | string | null
  parcela_id: number | null
  /** Null mientras el riego no ha terminado (o si quedó abierto). */
  duracion_seg: number | null
  fecha: Date
}

const POR_TANDA = 20

/** `horas` acota el registro al mismo tiempo que se está viendo en la gráfica. */
export function useRegistro(horas?: number, intervaloMs = 30000) {
  const [acciones, setAcciones] = useState<Accion[]>([])
  const [limite, setLimite] = useState(POR_TANDA)
  const [hayMas, setHayMas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [conectado, setConectado] = useState(false)

  const cargar = useCallback(async () => {
    try {
      // Se pide uno de más para saber si vale la pena ofrecer "Ver más".
      const filtro = horas ? `&hours=${horas}` : ''
      const res = await fetch(`${API_URL}/api/logs?limit=${limite + 1}${filtro}`)
      if (!res.ok) throw new Error()
      const filas: Array<{
        id: number
        tipo: string
        detalle: string | null
        origen: string | null
        parcela_id: number | null
        duracion_seg: number | null
        timestamp: string
      }> = await res.json()

      setHayMas(filas.length > limite)
      setAcciones(
        filas.slice(0, limite).map(f => ({
          id: f.id,
          tipo: f.tipo,
          detalle: f.detalle,
          origen: f.origen,
          parcela_id: f.parcela_id,
          duracion_seg: f.duracion_seg ?? null,
          fecha: parseTimestampUTC(f.timestamp),
        }))
      )
      setConectado(true)
    } catch {
      setConectado(false)
    } finally {
      setCargando(false)
    }
  }, [limite, horas])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, intervaloMs)
    return () => clearInterval(id)
  }, [cargar, intervaloMs])

  const verMas = useCallback(() => setLimite(l => l + POR_TANDA), [])

  return { acciones, hayMas, cargando, conectado, verMas }
}
