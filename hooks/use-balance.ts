'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

// El balance hídrico: cuánta agua va a pedir el cultivo esta semana contra
// cuánta va a llover. Es lo que permite adelantarse en vez de reaccionar.
//
// ETc = ET0 x Kc. El servidor arma el cálculo: aquí solo se lee. La app no
// puede inventarse un coeficiente ni una evaporación.

export interface DiaBalance {
  fecha: string
  et0_mm: number | null
  /** Lo que pide este cultivo. null si no hay coeficiente para él. */
  etc_mm: number | null
  lluvia_mm: number
  deficit_mm: number | null
}

/** Lo que el sistema NO puede calcular, y por qué. Se enseña tal cual. */
export interface Faltante {
  dato: 'etapa' | 'cultivo' | 'caudal_bomba' | 'area_ha'
  porque: string
}

export interface Balance {
  parcela: {
    id: number
    nombre: string
    cultivo: string | null
    etapa: string | null
    area_ha: number | null
  }
  kc: number | null
  dias: DiaBalance[]
  totales: {
    et0_mm: number
    etc_mm: number | null
    lluvia_mm: number
    deficit_mm: number | null
    deficit_litros_por_ha: number | null
    deficit_litros_parcela: number | null
  }
  riego: {
    eventos: number
    minutos: number
    /** Siempre null hasta que se sepa el caudal de la bomba. */
    mm: number | null
    sin_cerrar: number
  }
  faltantes: Faltante[]
}

// 'sin_ubicacion' no es un error: es que nadie ha dicho dónde está la parcela.
// Sin coordenadas no hay pronóstico, y sin pronóstico no hay evaporación.
type Estado = 'cargando' | 'listo' | 'sin_ubicacion' | 'error'

export function useBalance(dias = 7) {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [estado, setEstado] = useState<Estado>('cargando')

  const cargar = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/agua/balance?dias=${dias}`)
      if (res.status === 404) {
        setEstado('sin_ubicacion')
        return
      }
      if (!res.ok) {
        setEstado('error')
        return
      }
      setBalance(await res.json())
      setEstado('listo')
    } catch {
      setEstado('error')
    }
  }, [dias])

  useEffect(() => {
    cargar()
    // El pronóstico se actualiza despacio y el servidor ya lo guarda 15 min.
    // Media hora es de sobra y no castiga la batería del teléfono.
    const id = setInterval(cargar, 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [cargar])

  return { balance, estado, recargar: cargar }
}
