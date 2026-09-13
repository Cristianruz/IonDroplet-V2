'use client'

import { useState, useCallback, useRef } from 'react'
import { apiFetch } from '@/lib/api'

// El historial vive solo en memoria: al cerrar la app se va. No hay tabla para
// esto y guardar conversaciones sin necesidad no le sirve a nadie.

export interface Burbuja {
  id: number
  de: 'agricultor' | 'asistente'
  texto: string
}

export function useAsistente() {
  const [burbujas, setBurbujas] = useState<Burbuja[]>([])
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const siguienteId = useRef(1)

  const preguntar = useCallback(async (pregunta: string) => {
    const limpia = pregunta.trim()
    if (limpia === '' || enviando) return

    setAviso(null)
    setBurbujas(prev => [...prev, { id: siguienteId.current++, de: 'agricultor', texto: limpia }])
    setEnviando(true)

    try {
      const res = await apiFetch(`/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: limpia }),
      })

      if (!res.ok) {
        const cuerpo = await res.json().catch(() => ({}))
        setAviso(
          res.status === 503
            ? 'El asistente no está configurado en esta computadora. El riego sigue funcionando igual.'
            : (cuerpo.error ?? 'El asistente no pudo responder. El riego sigue funcionando igual.')
        )
        return
      }

      const { respuesta } = await res.json()
      setBurbujas(prev => [
        ...prev,
        { id: siguienteId.current++, de: 'asistente', texto: respuesta },
      ])
    } catch {
      setAviso('Sin internet no puedo responder. El riego sigue funcionando igual.')
    } finally {
      setEnviando(false)
    }
  }, [enviando])

  return { burbujas, enviando, aviso, preguntar }
}

export interface PropuestaUmbral {
  sugerido: number
  razon: string
  confianza: number | null
}

/** La IA propone el punto de riego. Nunca lo aplica sola. */
export function usePropuestaUmbral() {
  const [propuesta, setPropuesta] = useState<PropuestaUmbral | null>(null)
  const [pensando, setPensando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const pedirPropuesta = useCallback(async () => {
    setPensando(true)
    setAviso(null)
    setPropuesta(null)
    try {
      const res = await apiFetch(`/api/ai/umbral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => ({}))
        setAviso(cuerpo.error ?? 'El asistente no pudo proponer nada ahorita.')
        return
      }
      setPropuesta(await res.json())
    } catch {
      setAviso('Sin internet no puedo pedirle una recomendación al asistente.')
    } finally {
      setPensando(false)
    }
  }, [])

  const aplicar = useCallback(async (valor: number): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/ai/umbral/aplicar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor }),
      })
      if (!res.ok) return false
      setPropuesta(null)
      return true
    } catch {
      return false
    }
  }, [])

  const descartar = useCallback(() => {
    setPropuesta(null)
    setAviso(null)
  }, [])

  return { propuesta, pensando, aviso, pedirPropuesta, aplicar, descartar }
}
