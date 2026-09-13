'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

// El análisis completo del cultivo.
//
// CÓMO ESTÁ REPARTIDO EL TRABAJO, que es lo que hace que se pueda confiar:
// los INDICADORES los calcula el servidor con datos reales (pronóstico contra
// la temperatura crítica del cultivo, evapotranspiración contra lluvia,
// antigüedad de la lectura). La IA los interpreta, los ordena y los explica.
//
// La IA no inventa un porcentaje. La única probabilidad en porcentaje es la de
// lluvia, porque esa sí la publica el servicio meteorológico.

export type Nivel = 'alto' | 'medio' | 'bajo'
export type Confianza = 'alta' | 'media' | 'baja'

export interface Riesgo {
  nombre: string
  nivel: Nivel
  /** El número que sostiene el nivel. Siempre se enseña. */
  dato: string
  porque: string
  quehacer: string
}

export interface Accion {
  prioridad: Nivel
  texto: string
  porque: string
}

export interface Analisis {
  resumen: string
  confianza: Confianza
  porque_confianza: string
  riesgos: Riesgo[]
  pronostico: string
  acciones: Accion[]
  ionizacion: { recomendada: boolean; porque: string }
  faltantes: string[]
}

export interface Indicadores {
  sensor: { humedad: number | null; minutos: number | null; vigente: boolean }
  parcela: { nombre: string | null; cultivo: string | null; etapa: string | null; area_ha: number | null }
  umbral: number | null
  helada?: {
    nivel: Nivel | null
    minima_pronosticada: number | null
    dia: string | null
    critica_del_cultivo: number | null
    margen_grados: number | null
    etapa_sensible: boolean
  }
  calor?: { nivel: Nivel | null; maxima_pronosticada: number | null; estres_del_cultivo: number | null }
  lluvia?: { probabilidad_maxima_pct: number | null; mm_esperados_7d: number; es_probabilidad_real: boolean }
  agua: {
    etc_mm_7d: number
    lluvia_mm_7d: number
    deficit_mm_7d: number
    puntos_sobre_umbral: number | null
  } | null
  riego7d: { eventos: number; minutos: number; pct_con_ionizacion: number | null } | null
  ionizacion: { ultimo_pedido: string; desde: string | null; confirmada_por_el_aparato: boolean } | null
  fertirriego90d: Array<{ nutriente: string; total: number; unidad: string | null }>
  faltantes: string[]
}

type Estado = 'cargando' | 'listo' | 'error' | 'sin_configurar'

export function useAnalisis() {
  const [analisis, setAnalisis] = useState<Analisis | null>(null)
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null)
  const [cuando, setCuando] = useState<string | null>(null)
  const [estado, setEstado] = useState<Estado>('cargando')
  const [refrescando, setRefrescando] = useState(false)

  const cargar = useCallback(async (refrescar = false) => {
    if (refrescar) setRefrescando(true)
    try {
      const res = await apiFetch(`/api/ai/analisis${refrescar ? '?refrescar=1' : ''}`)
      if (res.status === 503) {
        setEstado('sin_configurar')
        return
      }
      if (!res.ok) {
        setEstado('error')
        return
      }
      const datos = await res.json()
      setAnalisis(datos.analisis ?? null)
      setIndicadores(datos.indicadores ?? null)
      setCuando(datos.cuando ?? null)
      setEstado('listo')
    } catch {
      setEstado('error')
    } finally {
      setRefrescando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return { analisis, indicadores, cuando, estado, refrescando, refrescar: () => cargar(true) }
}
