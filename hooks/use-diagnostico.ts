'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'
import { MAX_FOTOS, type ParteId, type ReporteDiagnostico } from '@/lib/diagnostico'

// Un celular saca fotos de 3 a 5 MB. Se encogen en el propio teléfono antes de
// salir: 2048 px del lado largo conservan el detalle de un ácaro o de la orilla
// de una mancha, y cada foto queda en ~0.5 MB.
const LADO_MAXIMO = 2048
const CALIDAD = 0.85
// Un análisis a fondo tarda de 30 a 90 s. Más de esto ya no va a llegar.
const TIEMPO_MAXIMO_MS = 170_000

// LO QUE PASA EN UN CELULAR DE VERDAD, y por qué este archivo es así:
// - En Android, abrir la cámara puede hacer que el navegador cierre la
//   pestaña por falta de memoria. Al volver, la página se recarga: se perdían
//   las fotos, lo elegido y hasta el reporte. Ahora todo se guarda en la
//   sesión del navegador y se recupera al volver.
// - Las fotos del celular traen la orientación en sus metadatos. Sin
//   respetarla, salían acostadas.
// - El iPhone guarda en HEIC desde la galería; algunos navegadores no lo
//   abren con createImageBitmap, pero sí como imagen normal. Se intentan los
//   dos caminos.
// - Si la pantalla se bloquea o se cambia de app durante el análisis, la
//   conexión se puede cortar. Se dice con claridad y las fotos se conservan.
const CLAVE_SESION = 'iondroplet.diagnostico'

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

/** Lo que el productor eligió en la pantalla, para recuperarlo tras una recarga. */
export interface Borrador {
  eleccion: string
  plantaDeclarada: string
  parte: ParteId | null
  nota: string
}

interface Guardado {
  fotos: { id: string; datos: string }[]
  reporte: ReporteDiagnostico | null
  borrador: Borrador | null
  /** Había un análisis en curso cuando la página se fue. */
  interrumpido: boolean
}

function leerSesion(): Guardado | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE_SESION)
    return crudo ? (JSON.parse(crudo) as Guardado) : null
  } catch {
    return null
  }
}

function escribirSesion(g: Guardado) {
  try {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(g))
  } catch {
    // Sin espacio: se intenta al menos sin las fotos, para no perder lo demás.
    try {
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ ...g, fotos: [] }))
    } catch {}
  }
}

/** Abre la foto respetando su orientación; si un camino falla, prueba el otro. */
async function abrirImagen(archivo: File): Promise<{ fuente: CanvasImageSource; ancho: number; alto: number; cerrar: () => void }> {
  try {
    const bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
    return { fuente: bitmap, ancho: bitmap.width, alto: bitmap.height, cerrar: () => bitmap.close?.() }
  } catch {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    try {
      await img.decode()
    } catch (e) {
      URL.revokeObjectURL(url)
      throw e
    }
    return { fuente: img, ancho: img.naturalWidth, alto: img.naturalHeight, cerrar: () => URL.revokeObjectURL(url) }
  }
}

async function encoger(archivo: File): Promise<Blob> {
  const imagen = await abrirImagen(archivo)
  try {
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.ancho, imagen.alto))
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.max(1, Math.round(imagen.ancho * escala))
    lienzo.height = Math.max(1, Math.round(imagen.alto * escala))
    const ctx = lienzo.getContext('2d')
    if (!ctx) throw new Error('sin canvas')
    ctx.drawImage(imagen.fuente, 0, 0, lienzo.width, lienzo.height)
    return await new Promise((resolver, rechazar) => {
      lienzo.toBlob(b => (b ? resolver(b) : rechazar(new Error('no se pudo convertir'))), 'image/jpeg', CALIDAD)
    })
  } finally {
    imagen.cerrar()
  }
}

function aBase64(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(String(lector.result).split(',')[1] ?? '')
    lector.onerror = () => rechazar(lector.error)
    lector.readAsDataURL(blob)
  })
}

function deBase64(datos: string): Blob {
  const binario = atob(datos)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return new Blob([bytes], { type: 'image/jpeg' })
}

export type EstadoDiagnostico = 'armando' | 'analizando' | 'listo'

export function useDiagnostico() {
  const [fotos, setFotos] = useState<FotoLista[]>([])
  const [preparando, setPreparando] = useState(false)
  const [estado, setEstado] = useState<EstadoDiagnostico>('armando')
  const [reporte, setReporte] = useState<ReporteDiagnostico | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [segundos, setSegundos] = useState(0)
  // Lo recuperado de la sesión; la pantalla lo usa para rellenar sus campos.
  const [borradorRecuperado, setBorradorRecuperado] = useState<Borrador | null>(null)
  const borrador = useRef<Borrador | null>(null)
  const recuperada = useRef(false)
  // La página se está yendo (recarga, cambio de app que la cierra). El fetch
  // cancelado todavía llega al catch: no debe borrar la marca de interrumpido.
  const saliendo = useRef(false)
  useEffect(() => {
    const alSalir = () => { saliendo.current = true }
    window.addEventListener('pagehide', alSalir)
    return () => window.removeEventListener('pagehide', alSalir)
  }, [])

  // Las URL de las miniaturas viven fuera de React para liberarlas al salir.
  const urls = useRef(new Set<string>())
  const contador = useRef(0)
  useEffect(() => {
    const vivas = urls.current
    return () => vivas.forEach(u => URL.revokeObjectURL(u))
  }, [])

  // --- Recuperar lo que había antes de una recarga ---
  useEffect(() => {
    const g = leerSesion()
    if (g) {
      const recuperadas = (g.fotos ?? []).slice(0, MAX_FOTOS).flatMap(f => {
        try {
          const vistaPrevia = URL.createObjectURL(deBase64(f.datos))
          urls.current.add(vistaPrevia)
          return [{ id: `foto-${++contador.current}`, vistaPrevia, tipo: 'image/jpeg' as const, datos: f.datos }]
        } catch {
          return []
        }
      })
      setFotos(recuperadas)
      if (g.reporte) {
        setReporte(g.reporte)
        setEstado('listo')
      } else if (g.interrumpido) {
        setAviso('El análisis anterior se interrumpió (la pantalla se bloqueó o se cambió de aplicación). Tus fotos siguen aquí: vuelve a analizarlas.')
      }
      if (g.borrador) {
        borrador.current = g.borrador
        setBorradorRecuperado(g.borrador)
      }
    }
    recuperada.current = true
  }, [])

  const guardar = useCallback((cambios: Partial<Guardado>) => {
    if (!recuperada.current) return
    const actual = leerSesion() ?? { fotos: [], reporte: null, borrador: null, interrumpido: false }
    escribirSesion({ ...actual, ...cambios })
  }, [])

  // Las fotos se guardan cada vez que cambian.
  useEffect(() => {
    guardar({ fotos: fotos.map(({ id, datos }) => ({ id, datos })) })
  }, [fotos, guardar])

  /** La pantalla avisa aquí cada cambio en lo elegido. */
  const guardarBorrador = useCallback(
    (b: Borrador) => {
      borrador.current = b
      guardar({ borrador: b })
    },
    [guardar]
  )

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
      const listas: FotoLista[] = []
      let fallidas = 0
      // Una foto que no abre no tira a las demás.
      for (const archivo of nuevas) {
        try {
          const pequena = await encoger(archivo)
          const vistaPrevia = URL.createObjectURL(pequena)
          urls.current.add(vistaPrevia)
          // Sin crypto.randomUUID: no existe en http://192.168.x.x, que es
          // justo como se abre desde el celular en la wifi del rancho.
          listas.push({ id: `foto-${++contador.current}`, vistaPrevia, tipo: 'image/jpeg', datos: await aBase64(pequena) })
        } catch {
          fallidas++
        }
      }
      setFotos(prev => [...prev, ...listas].slice(0, MAX_FOTOS))
      if (fallidas > 0) {
        setAviso(
          fallidas === nuevas.length
            ? 'No se pudo abrir la foto. Si viene de la galería de un iPhone (formato HEIC), tómala directo con el botón «Tomar foto».'
            : `No se pudo abrir ${fallidas === 1 ? 'una de las fotos' : `${fallidas} de las fotos`}; las demás sí se agregaron.`
        )
      }
      setPreparando(false)
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
      // Si la página se va a media espera, al volver se sabrá qué pasó.
      guardar({ reporte: null, interrumpido: true })

      const control = new AbortController()
      const limite = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS)
      try {
        const res = await apiFetch('/api/ai/foto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: control.signal,
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
              : res.status === 413
                ? 'Las fotos pesan demasiado. Quita una e intenta de nuevo.'
                : res.status === 429
                  ? 'Hay muchas revisiones seguidas. Espera un minuto y vuelve a intentar.'
                  : (cuerpo.error ?? 'No se pudieron revisar las fotos.')
          )
          setEstado('armando')
          guardar({ interrumpido: false })
          return
        }
        const nuevo: ReporteDiagnostico = await res.json()
        setReporte(nuevo)
        setEstado('listo')
        guardar({ reporte: nuevo, interrumpido: false })
      } catch {
        if (saliendo.current) return
        setAviso(
          control.signal.aborted
            ? 'El análisis tardó demasiado y se canceló. Tus fotos siguen aquí: vuelve a intentarlo.'
            : 'Se perdió la conexión durante el análisis (puede pasar si la pantalla se bloquea o se cambia de aplicación). Tus fotos siguen aquí: mantén la pantalla encendida y vuelve a intentarlo.'
        )
        setEstado('armando')
        // Un segundo después: si la página se está yendo, este temporizador
        // ya no corre y la marca sobrevive para avisar al volver.
        setTimeout(() => guardar({ interrumpido: false }), 1000)
      } finally {
        clearTimeout(limite)
      }
    },
    [fotos, guardar]
  )

  /** Vuelve a armar, conservando las fotos (para agregar la que pidió el reporte). */
  const corregir = useCallback(() => {
    setReporte(null)
    setEstado('armando')
    guardar({ reporte: null })
  }, [guardar])

  const empezarDeNuevo = useCallback(() => {
    urls.current.forEach(u => URL.revokeObjectURL(u))
    urls.current.clear()
    setFotos([])
    setReporte(null)
    setAviso(null)
    setEstado('armando')
    try {
      sessionStorage.removeItem(CLAVE_SESION)
    } catch {}
  }, [])

  return {
    fotos,
    preparando,
    estado,
    reporte,
    aviso,
    segundos,
    borradorRecuperado,
    guardarBorrador,
    agregarFotos,
    quitarFoto,
    analizar,
    corregir,
    empezarDeNuevo,
  }
}
