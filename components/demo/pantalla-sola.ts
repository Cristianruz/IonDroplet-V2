'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Lo que comparten las pantallas que corren solas en el evento (/proyector y
// /proceso): un reloj de guion con pausa y saltos, la pantalla que no se
// apaga, las teclas (espacio, flechas, F) y los controles que aparecen al
// mover el mouse y se van solos junto con el cursor.

/** Donde vive la demostración. Si la pantalla corre en la laptop, el QR igual manda ahí. */
const DIRECCION_PUBLICA = 'https://iondroplet-riego.vercel.app'

export function direccionParaQR(): string {
  const { hostname, origin } = window.location
  const local =
    hostname === 'localhost' ||
    hostname === '[::1]' ||
    /^127\./.test(hostname) ||
    /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(hostname)
  return local ? DIRECCION_PUBLICA : origin
}

const OCULTAR_CONTROLES_MS = 3000

export function pantallaCompleta(): void {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  else document.documentElement.requestFullscreen().catch(() => {})
}

interface Opciones {
  /** El segundo donde empieza el paso de junto (1 = siguiente, -1 = anterior). */
  saltar: (segundo: number, direccion: 1 | -1) => number
}

export function usePantallaSola({ saltar }: Opciones) {
  const [segundo, setSegundo] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [controles, setControles] = useState(true)
  const reloj = useRef({ base: 0, desde: 0, pausado: false, listo: false })
  const ocultar = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saltarRef = useRef(saltar)
  saltarRef.current = saltar

  /** El segundo del guion ahora mismo (para lo que se anima a 60 cuadros). */
  const ahora = useCallback(() => {
    const r = reloj.current
    if (!r.listo) return 0
    return r.pausado ? r.base : r.base + (performance.now() - r.desde) / 1000
  }, [])

  const irA = useCallback((s: number) => {
    reloj.current.base = s
    reloj.current.desde = performance.now()
    setSegundo(s)
  }, [])

  const alternarPausa = useCallback(() => {
    const r = reloj.current
    if (r.pausado) {
      r.desde = performance.now()
      r.pausado = false
    } else {
      r.base = ahora()
      r.pausado = true
    }
    setPausado(r.pausado)
  }, [ahora])

  const mostrarControles = useCallback(() => {
    setControles(true)
    if (ocultar.current) clearTimeout(ocultar.current)
    ocultar.current = setTimeout(() => setControles(false), OCULTAR_CONTROLES_MS)
  }, [])

  // Diez cuadros por segundo bastan para los textos y los números.
  useEffect(() => {
    // ?desde=40 abre el guion en el segundo 40 (para revisar un paso o grabar).
    const desde = Number(new URLSearchParams(window.location.search).get('desde'))
    if (Number.isFinite(desde) && desde > 0) reloj.current.base = desde
    reloj.current.desde = performance.now()
    reloj.current.listo = true
    mostrarControles()
    const cada = setInterval(() => {
      if (!reloj.current.pausado) setSegundo(ahora())
    }, 100)
    return () => {
      clearInterval(cada)
      if (ocultar.current) clearTimeout(ocultar.current)
    }
  }, [ahora, mostrarControles])

  // Que la pantalla no se apague ni entre el protector a media demostración.
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let candado: WakeLockSentinel | null = null
    const pedir = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        candado = await navigator.wakeLock.request('screen')
      } catch {}
    }
    pedir()
    document.addEventListener('visibilitychange', pedir)
    return () => {
      document.removeEventListener('visibilitychange', pedir)
      candado?.release().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === ' ') alternarPausa()
      else if (e.key === 'ArrowRight') irA(saltarRef.current(ahora(), 1))
      else if (e.key === 'ArrowLeft') irA(saltarRef.current(ahora(), -1))
      else if (e.key === 'f' || e.key === 'F') pantallaCompleta()
      else return
      e.preventDefault()
      mostrarControles()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [ahora, alternarPausa, irA, mostrarControles])

  return {
    segundo,
    ahora,
    pausado,
    alternarPausa,
    controles,
    mostrarControles,
    anterior: () => irA(saltarRef.current(ahora(), -1)),
    siguiente: () => irA(saltarRef.current(ahora(), 1)),
  }
}
