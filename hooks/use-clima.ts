'use client'

import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '@/lib/api'

export interface AvisoClima {
  tipo: 'helada' | 'lluvia' | 'viento' | 'calor'
  nivel: 'peligro' | 'aviso'
  dia: string
  texto: string
}

export interface Clima {
  ubicacion: { latitud: number; longitud: number; fuente: string | null; desde: string | null }
  ahora: {
    temperature_2m: number
    relative_humidity_2m: number
    precipitation: number
    wind_speed_10m: number
  }
  dias: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
    precipitation_probability_max: number[]
    wind_speed_10m_max: number[]
  }
  avisos: AvisoClima[]
}

// 'sin_ubicacion' no es un error: es que todavía nadie ha dicho dónde está la
// parcela. No se adivina una ubicación — en Chihuahua dos municipios a 100 km
// tienen 6 grados de diferencia en la mínima, y eso cambia un aviso de helada.
type Estado = 'cargando' | 'listo' | 'sin_ubicacion' | 'error'

export function useClima(parcelaId: number | null) {
  const [clima, setClima] = useState<Clima | null>(null)
  const [estado, setEstado] = useState<Estado>('cargando')
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/clima`)
      if (res.status === 404) {
        setEstado('sin_ubicacion')
        return
      }
      if (!res.ok) {
        setEstado('error')
        return
      }
      setClima(await res.json())
      setEstado('listo')
    } catch {
      setEstado('error')
    }
  }, [])

  useEffect(() => {
    cargar()
    // El clima cambia despacio: media hora es de sobra.
    const id = setInterval(cargar, 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [cargar])

  // Mientras el aparato no traiga GPS, la ubicación la da el teléfono del
  // agricultor, que está parado en la parcela. Se marca como 'telefono' para
  // que se sepa de dónde vino.
  const usarUbicacionDelTelefono = useCallback(async (): Promise<string | null> => {
    if (parcelaId === null) return 'Primero registra tu parcela.'
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return 'Este teléfono no puede dar su ubicación.'
    }
    setGuardandoUbicacion(true)
    try {
      const posicion = await new Promise<GeolocationPosition>((resolver, rechazar) => {
        navigator.geolocation.getCurrentPosition(resolver, rechazar, {
          enableHighAccuracy: true,
          timeout: 15000,
        })
      })
      const res = await fetch(`${API_URL}/api/parcelas/${parcelaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
          ubicacion_fuente: 'telefono',
          ubicacion_fecha: new Date().toISOString().slice(0, 19).replace('T', ' '),
        }),
      })
      if (!res.ok) return 'No se pudo guardar la ubicación.'
      await cargar()
      return null
    } catch {
      return 'No se pudo leer la ubicación. Revisa que le hayas dado permiso al navegador.'
    } finally {
      setGuardandoUbicacion(false)
    }
  }, [parcelaId, cargar])

  return { clima, estado, guardandoUbicacion, usarUbicacionDelTelefono, recargar: cargar }
}
