'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'
import { MAX_FOTOS, type ParteId, type ReporteDiagnostico } from '@/lib/diagnostico'

// Un celular saca fotos de 3 a 5 MB. Se encogen en el propio teléfono antes de
// salir: 2048 px del lado largo conservan el detalle de un ácaro o de la orilla
// de una mancha, y cada foto queda en ~0.5 MB.
const LADO_MAXIMO = 2048
const CALIDAD = 0.85

export interface FotoLista {
  id: string
  /** Para la miniatura. Se libera al quitar la foto. */
  vistaPrevia: string
  tipo: 'image/jpeg'
  /** base64 sin el prefijo data: */
  datos: string
}

export interface DatosDelDiagnostico {
  parcelaId: number | null
  plantaDeclarada: string
  parte: ParteId | null
  nota: string
  catalogo: string[]
}

async function encoger(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(bitmap.width * escala)
  lienzo.height = Math.round(bitmap.height * escala)
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('sin canvas')
  ctx.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height)
  bitmap.close?.()
  return new Promise((resolver, rechazar) => {
    lienzo.toBlob(b => (b ? resolver(b) : rechazar(new Error('no se pudo convertir'))), 'image/jpeg', CALIDAD)
  })
}

function aBase64(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(String(lector.result).split(',')[1] ?? '')
    lector.onerror = () => rechazar(lector.error)
    lector.readAsDataURL(blob)
  })
}

export type EstadoDiagnostico = 'armando' | 'analizando' | 'listo'

export function useDiagnostico() {
  const [fotos, setFotos] = useState<FotoLista[]>([])
  const [preparando, setPreparando] = useState(false)
  const [estado, setEstado] = useState<EstadoDiagnostico>('armando')
  const [reporte, setReporte] = useState<ReporteDiagnostico | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [segundos, setSegundos] = useState(0)

  // Las URL de las miniaturas viven fuera de React para liberarlas al salir.
  const urls = useRef(new Set<string>())
  const contador = useRef(0)
  useEffect(() => {
    const vivas = urls.current
    return () => vivas.forEach(u => URL.revokeObjectURL(u))
  }, [])

  // Cuenta los segundos mientras analiza: un análisis a fondo tarda y la
  // pantalla no debe parecer congelada.
  useEffect(() => {
    if (estado !== 'analizando') return
    setSegundos(0)
    const reloj = setInterval(() => setSegundos(s => s + 1), 1000)
    return () => clearInterval(reloj)
  }, [estado])

  const agregarFotos = useCallback(
    async (archivos: FileList | File[]) => {
      const lugar = MAX_FOTOS - fotos.length
      const nuevas = Array.from(archivos).slice(0, Math.max(0, lugar))
      if (nuevas.length === 0) return
      setPreparando(true)
      setAviso(null)
      try {
        const listas: FotoLista[] = []
        for (const archivo of nuevas) {
          const pequena = await encoger(archivo)
          const vistaPrevia = URL.createObjectURL(pequena)
          urls.current.add(vistaPrevia)
          // Sin crypto.randomUUID: no existe en http://192.168.x.x, que es
          // justo como se abre desde el celular en la wifi del rancho.
          listas.push({ id: `foto-${++contador.current}`, vistaPrevia, tipo: 'image/jpeg', datos: await aBase64(pequena) })
        }
        setFotos(prev => [...prev, ...listas].slice(0, MAX_FOTOS))
      } catch {
        setAviso('No se pudo abrir esa foto. Intenta tomarla otra vez.')
      } finally {
        setPreparando(false)
      }
    },
    [fotos.length]
  )

  const quitarFoto = useCallback((id: string) => {
    setFotos(prev => {
      const sale = prev.find(f => f.id === id)
      if (sale) {
        URL.revokeObjectURL(sale.vistaPrevia)
        urls.current.delete(sale.vistaPrevia)
      }
      return prev.filter(f => f.id !== id)
    })
  }, [])

  const analizar = useCallback(
    async (datos: DatosDelDiagnostico) => {
      if (fotos.length === 0) return
      setEstado('analizando')
      setAviso(null)
      setReporte(null)
      try {
        const res = await apiFetch('/api/ai/foto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fotos: fotos.map(({ tipo, datos: d }) => ({ tipo, datos: d })),
            parcelaId: datos.parcelaId,
            plantaDeclarada: datos.plantaDeclarada,
            parte: datos.parte ?? 'otra',
            nota: datos.nota,
            catalogo: datos.catalogo,
          }),
        })
        if (!res.ok) {
          const cuerpo = await res.json().catch(() => ({}))
          setAviso(
            res.status === 403
              ? 'El análisis con IA es del dueño: vincula este aparato en Ajustes → Opciones del técnico.'
              : res.status === 429
                ? 'Van muchas revisiones seguidas. Espera un minuto y vuelve a intentar.'
                : (cuerpo.error ?? 'No se pudieron revisar las fotos.')
          )
          setEstado('armando')
          return
        }
        setReporte(await res.json())
        setEstado('listo')
      } catch {
        setAviso('No se pudieron revisar las fotos. Revisa que haya conexión con la computadora del riego.')
        setEstado('armando')
      }
    },
    [fotos]
  )

  /** Vuelve a armar, conservando las fotos (para agregar la que pidió el reporte). */
  const corregir = useCallback(() => {
    setReporte(null)
    setEstado('armando')
  }, [])

  const empezarDeNuevo = useCallback(() => {
    urls.current.forEach(u => URL.revokeObjectURL(u))
    urls.current.clear()
    setFotos([])
    setReporte(null)
    setAviso(null)
    setEstado('armando')
  }, [])

  return {
    fotos,
    preparando,
    estado,
    reporte,
    aviso,
    segundos,
    agregarFotos,
    quitarFoto,
    analizar,
    corregir,
    empezarDeNuevo,
  }
}
