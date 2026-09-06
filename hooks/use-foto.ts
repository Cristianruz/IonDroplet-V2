'use client'

import { useState, useCallback } from 'react'
import { API_URL } from '@/lib/api'

export interface RevisionDeFoto {
  esPlanta: boolean
  resumen: string
  posible: string
  comoConfirmarlo: string
  urgencia: 'alta' | 'media' | 'baja' | 'ninguna'
}

// Un celular saca fotos de 3 a 5 MB. Mandarlas enteras por el WiFi del rancho
// sería una tortura, y no hace falta: para ver una hoja con 1024 px sobra.
// Se encoge en el propio teléfono antes de salir.
const LADO_MAXIMO = 1024
const CALIDAD = 0.8

async function encoger(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('sin canvas')
  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close?.()

  return new Promise((resolver, rechazar) => {
    lienzo.toBlob(
      b => (b ? resolver(b) : rechazar(new Error('no se pudo convertir'))),
      'image/jpeg',
      CALIDAD
    )
  })
}

export function useFoto() {
  const [revision, setRevision] = useState<RevisionDeFoto | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null)
  const [revisando, setRevisando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const revisarFoto = useCallback(async (archivo: File) => {
    setRevisando(true)
    setAviso(null)
    setRevision(null)
    try {
      const pequena = await encoger(archivo)
      setVistaPrevia(URL.createObjectURL(pequena))

      const res = await fetch(`${API_URL}/api/ai/foto`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: pequena,
      })
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => ({}))
        setAviso(cuerpo.error ?? 'No se pudo revisar la foto.')
        return
      }
      setRevision(await res.json())
    } catch {
      setAviso('No se pudo revisar la foto. Revisa que haya conexión.')
    } finally {
      setRevisando(false)
    }
  }, [])

  const limpiar = useCallback(() => {
    setRevision(null)
    setAviso(null)
    setVistaPrevia(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  return { revision, vistaPrevia, revisando, aviso, revisarFoto, limpiar }
}
