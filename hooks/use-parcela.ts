'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { API_URL } from '@/lib/api'

// Hook hermano de use-iondroplet: aquí vive todo lo de la parcela.
// Los componentes reciben props, no hacen fetch.

export interface Parcela {
  id: number
  nombre: string | null
  cultivo: string | null
  etapa: string | null
  area_ha: number | null
  num_hileras: number | null
  tipo_sistema: string | null
  hum_min: number | null
  hum_max: number | null
  device_id: string | null
  creado: string | null
}

// Lo que el formulario puede cambiar. El resto de columnas no se toca:
// PUT /api/parcelas/:id solo actualiza los campos que se le mandan.
export interface DatosParcela {
  nombre: string
  cultivo: string
  etapa: string | null
  area_ha: number | null
  hum_min: number
}

interface Umbrales {
  temp_max: number | null
  hum_max: number | null
  volt_min: number | null
  volt_max: number | null
  curr_max: number | null
}

// OJO: el número que enciende la bomba es thresholds.hum_max, aunque funcione
// como mínimo (el nombre viene de antes y no se cambia sin migración).
// parcelas.hum_min es la copia que vive con la parcela; se guardan las dos
// para que la pantalla no prometa algo que la bomba no obedece.
const UMBRAL_POR_OMISION = 40

export function useParcela(intervaloMs = 30000) {
  const [parcela, setParcela] = useState<Parcela | null>(null)
  const [umbralRiego, setUmbralRiego] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [conectado, setConectado] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Se guardan los umbrales completos porque POST /api/thresholds borra la fila
  // anterior: si no se mandan los cinco campos, se pierden los otros cuatro.
  const umbralesCompletos = useRef<Umbrales | null>(null)
  // Evita que una respuesta lenta pise el valor recién guardado
  const ultimoComando = useRef(0)

  // Una vez que se sabe cuál parcela es, se lee por id. La lista solo sirve
  // para encontrarla la primera vez (el alcance de esta versión es una sola).
  const idConocido = useRef<number | null>(null)

  const cargar = useCallback(async () => {
    try {
      const [resParcelas, resUmbrales] = await Promise.all([
        fetch(
          idConocido.current !== null
            ? `${API_URL}/api/parcelas/${idConocido.current}`
            : `${API_URL}/api/parcelas`
        ),
        fetch(`${API_URL}/api/thresholds`),
      ])
      if (!resUmbrales.ok) throw new Error()

      const umbrales: Umbrales = await resUmbrales.json()
      umbralesCompletos.current = umbrales

      if (resParcelas.ok) {
        const cuerpo = await resParcelas.json()
        const encontrada: Parcela | null = Array.isArray(cuerpo)
          ? (cuerpo.length > 0 ? cuerpo[0] : null)
          : cuerpo
        idConocido.current = encontrada ? encontrada.id : null
        setParcela(encontrada)
      } else if (resParcelas.status === 404) {
        // La parcela que se venía leyendo ya no está: volver a buscarla.
        idConocido.current = null
        setParcela(null)
      } else {
        throw new Error()
      }

      if (Date.now() - ultimoComando.current > 2000) {
        setUmbralRiego(
          umbrales.hum_max !== null && umbrales.hum_max !== undefined
            ? Number(umbrales.hum_max)
            : UMBRAL_POR_OMISION
        )
      }
      setConectado(true)
    } catch {
      setConectado(false)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, intervaloMs)
    return () => clearInterval(id)
  }, [cargar, intervaloMs])

  // Escribe el número que de verdad enciende la bomba, cuidando de no borrar
  // los otros cuatro umbrales.
  const escribirUmbralDeRiego = useCallback(async (nuevo: number): Promise<boolean> => {
    const previos = umbralesCompletos.current ?? {
      temp_max: null, hum_max: null, volt_min: null, volt_max: null, curr_max: null,
    }
    const res = await fetch(`${API_URL}/api/thresholds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...previos, hum_max: nuevo }),
    })
    if (!res.ok) return false
    umbralesCompletos.current = { ...previos, hum_max: nuevo }
    return true
  }, [])

  // Alta si todavía no hay parcela, edición si ya existe.
  const guardarParcela = useCallback(
    async (datos: DatosParcela): Promise<boolean> => {
      setGuardando(true)
      ultimoComando.current = Date.now()
      try {
        const nueva = parcela === null
        const res = await fetch(
          nueva ? `${API_URL}/api/parcelas` : `${API_URL}/api/parcelas/${parcela.id}`,
          {
            method: nueva ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
          }
        )
        if (!res.ok) return false
        const guardada: Parcela = await res.json()
        idConocido.current = guardada.id
        setParcela(guardada)

        // El punto de riego del formulario tiene que llegar a la bomba,
        // no quedarse guardado nada más en la ficha de la parcela.
        if (datos.hum_min !== umbralRiego) {
          const listo = await escribirUmbralDeRiego(datos.hum_min)
          if (listo) setUmbralRiego(datos.hum_min)
        }
        return true
      } catch {
        return false
      } finally {
        setGuardando(false)
      }
    },
    [parcela, umbralRiego, escribirUmbralDeRiego]
  )

  // Cambia el punto de riego desde la vista, sin abrir el formulario.
  const guardarUmbral = useCallback(
    async (nuevo: number): Promise<boolean> => {
      ultimoComando.current = Date.now()
      setUmbralRiego(nuevo)
      setGuardando(true)
      try {
        if (!(await escribirUmbralDeRiego(nuevo))) return false

        if (parcela !== null) {
          const resParcela = await fetch(`${API_URL}/api/parcelas/${parcela.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hum_min: nuevo }),
          })
          if (resParcela.ok) setParcela(await resParcela.json())
        }
        return true
      } catch {
        return false
      } finally {
        setGuardando(false)
      }
    },
    [parcela, escribirUmbralDeRiego]
  )

  return {
    parcela,
    umbralRiego,
    cargando,
    conectado,
    guardando,
    guardarParcela,
    guardarUmbral,
    recargar: cargar,
  }
}
