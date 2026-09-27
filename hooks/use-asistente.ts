'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'

// La conversación vive en la sesión del navegador: pasa de la burbuja a la
// pantalla del asistente y sobrevive a cambiar de pestaña, pero se va al
// cerrar la app. No hay tabla para esto: guardar pláticas no le sirve a nadie.
//
// Al backend se le manda la conversación reciente junto con la pregunta: sin
// ella, "¿y mañana?" no tenía de qué hablar.

/** Lo que el asistente puede proponer; el productor lo confirma con un botón. */
export type AccionChat = 'regar' | 'detener' | 'automatico' | 'manual'

export interface Burbuja {
  id: number
  de: 'agricultor' | 'asistente'
  texto: string
  accion?: AccionChat | null
  /** Ya se tocó el botón de la acción: no se ofrece dos veces. */
  accionHecha?: boolean
}

const CLAVE = 'iondroplet.chat'
// Los mismos que acepta el backend (ia/asistente-chat.js).
const TURNOS_QUE_SE_MANDAN = 12

/** Preguntas de arranque, para quien no sabe qué se le puede preguntar. */
export const SUGERENCIAS = [
  '¿Conviene regar hoy?',
  '¿Hay riesgo de helada esta semana?',
  '¿Qué requiere mi cultivo en esta etapa?',
  '¿Cómo verifico que el sensor mida correctamente?',
]

function leerGuardadas(): Burbuja[] {
  try {
    const crudo = JSON.parse(sessionStorage.getItem(CLAVE) ?? '[]')
    return Array.isArray(crudo) ? crudo.filter(b => b && typeof b.texto === 'string') : []
  } catch {
    return []
  }
}

export function useAsistente() {
  const [burbujas, setBurbujas] = useState<Burbuja[]>([])
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  // Sin la llave del dueño (403) el chat ofrece vincular el aparato ahí mismo
  // y guarda la pregunta para hacerla en cuanto quede vinculado.
  const [pendiente, setPendiente] = useState<string | null>(null)
  const siguienteId = useRef(1)
  const cargada = useRef(false)

  // Se lee después de montar: en el servidor no hay sessionStorage. La
  // burbuja vive montada en todas las pantallas, así que vuelve a leer al
  // abrirse: si no, pisaría lo que se platicó en la pantalla del asistente.
  const recargar = useCallback(() => {
    const guardadas = leerGuardadas()
    setBurbujas(guardadas)
    siguienteId.current = guardadas.reduce((m, b) => Math.max(m, b.id), 0) + 1
    cargada.current = true
  }, [])
  useEffect(recargar, [recargar])

  useEffect(() => {
    if (!cargada.current) return
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(burbujas.slice(-40)))
    } catch {}
  }, [burbujas])

  const preguntar = useCallback(async (pregunta: string) => {
    const limpia = pregunta.trim()
    if (limpia === '' || enviando) return

    // La conversación ANTES de esta pregunta.
    const historial = burbujas.slice(-TURNOS_QUE_SE_MANDAN).map(({ de, texto }) => ({ de, texto }))

    setAviso(null)
    setPendiente(null)
    const idPregunta = siguienteId.current++
    setBurbujas(prev => [...prev, { id: idPregunta, de: 'agricultor', texto: limpia }])
    setEnviando(true)

    try {
      const res = await apiFetch(`/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: limpia, historial }),
      })

      if (res.status === 403) {
        // La pregunta se quita de la plática y se hace otra vez al vincular.
        setBurbujas(prev => prev.filter(b => b.id !== idPregunta))
        setPendiente(limpia)
        return
      }
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => ({}))
        setAviso(
          res.status === 429
              ? 'Van muchas preguntas seguidas. Espera un minuto y vuelve a intentar.'
              : res.status === 503
                ? 'El asistente no está configurado en esta computadora. El riego sigue funcionando igual.'
                : (cuerpo.error ?? 'El asistente no pudo responder. El riego sigue funcionando igual.')
        )
        return
      }

      const { respuesta, accion } = await res.json()
      setBurbujas(prev => [
        ...prev,
        { id: siguienteId.current++, de: 'asistente', texto: respuesta, accion: accion ?? null },
      ])
    } catch {
      setAviso('Sin conexión no puedo responder. El riego sigue funcionando igual.')
    } finally {
      setEnviando(false)
    }
  }, [enviando, burbujas])

  const nuevaConversacion = useCallback(() => {
    setBurbujas([])
    setAviso(null)
    setPendiente(null)
  }, [])

  const marcarAccionHecha = useCallback((id: number) => {
    setBurbujas(prev => prev.map(b => (b.id === id ? { ...b, accionHecha: true } : b)))
  }, [])

  return {
    burbujas, enviando, aviso, pendiente, preguntar, nuevaConversacion, recargar, marcarAccionHecha,
  }
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
        setAviso(cuerpo.error ?? 'El asistente no pudo proponer un valor en este momento.')
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
