'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ejecutarEscenario, esMensajeEscenario, type MensajeEstado } from './escenarios'

// Cuando la app vive dentro del celular de la vista de presentación, el panel
// de al lado le pide los escenarios por aquí y ella le cuenta cada segundo
// cómo va la tierra. Solo habla con una página de su mismo sitio.

const CADA_CUANTO_MS = 1000

export function PuenteDemo() {
  const router = useRouter()

  useEffect(() => {
    if (window.parent === window) return
    const origen = window.location.origin

    const alRecibir = (e: MessageEvent) => {
      if (e.origin !== origen || e.source !== window.parent) return
      if (esMensajeEscenario(e.data)) ejecutarEscenario(e.data.escenario, ruta => router.push(ruta))
    }
    window.addEventListener('message', alRecibir)

    let vivo = true
    const contar = async () => {
      const { resumenDemo } = await import('@/lib/demo')
      if (!vivo) return
      const mensaje: MensajeEstado = { tipo: 'iondroplet:estado', resumen: resumenDemo() }
      window.parent.postMessage(mensaje, origen)
    }
    contar()
    const cada = setInterval(contar, CADA_CUANTO_MS)

    return () => {
      vivo = false
      clearInterval(cada)
      window.removeEventListener('message', alRecibir)
    }
  }, [router])

  return null
}
