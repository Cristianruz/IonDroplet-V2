'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { EVENTO_REFRESCAR, MODO_DEMO } from '@/lib/modo'

export type Pantalla = 'inicio' | 'parcela' | 'historial' | 'plagas'

// La lectura del sistema, en una o dos frases, arriba de cada pantalla.
// El contexto lo arma el servidor con el sensor, el clima, el cultivo y su
// etapa; la app solo dice de qué pantalla se trata. Si le falta un dato, lo
// dice en vez de suponerlo — igual que el resto del asistente.

interface Props {
  pantalla: Pantalla
  /** Como tarjeta propia, con título; si no, una línea discreta. */
  destacado?: boolean
  /** Una línea dentro de un recuadro turquesa claro (Inicio). */
  enCaja?: boolean
  /**
   * Solo en la demostración: cuando cambia (empieza o termina un riego, se
   * cae el sensor) se vuelve a pedir, para que el consejo no contradiga al
   * medidor. En el sistema real se pide una vez por visita a la pantalla.
   */
  clave?: string
}

export function ConsejoIA({ pantalla, destacado = false, enCaja = false, clave }: Props) {
  const [consejo, setConsejo] = useState<string | null>(null)
  const [pensando, setPensando] = useState(true)
  const [fallo, setFallo] = useState(false)

  const pedir = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/ai/consejo?pantalla=${pantalla}`)
      if (!res.ok) {
        setFallo(true)
        return
      }
      const datos = await res.json()
      setConsejo(datos.consejo)
    } catch {
      setFallo(true)
    } finally {
      setPensando(false)
    }
  }, [pantalla])

  useEffect(() => {
    pedir()
  }, [pedir, clave])

  useEffect(() => {
    if (!MODO_DEMO) return
    window.addEventListener(EVENTO_REFRESCAR, pedir)
    return () => window.removeEventListener(EVENTO_REFRESCAR, pedir)
  }, [pedir])

  // Si el asistente no pudo opinar, la pantalla sigue sirviendo igual: no se
  // enseña un hueco ni un error que no le importa al agricultor.
  if (fallo) return null

  if (pensando) {
    return destacado ? (
      <div className="tarjeta flex flex-col gap-3">
        <div className="esqueleto" style={{ width: '40%', height: 20 }} aria-hidden />
        <div className="esqueleto" style={{ width: '100%', height: 18 }} aria-hidden />
        <div className="esqueleto" style={{ width: '75%', height: 18 }} aria-hidden />
      </div>
    ) : (
      <div className="esqueleto" style={{ width: '85%', height: 18 }} aria-hidden />
    )
  }

  if (!consejo) return null

  if (enCaja) {
    return (
      <div className="rounded-[14px] px-4 py-3 flex items-start gap-2.5" style={{ background: 'var(--acento-suave)' }}>
        <Sparkles size={17} style={{ color: 'var(--acento)', flexShrink: 0, marginTop: 2 }} aria-hidden />
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--tinta)' }} role="status">
          {consejo}
        </p>
      </div>
    )
  }

  if (!destacado) {
    return (
      <p className="text-[15px] flex items-start gap-2 texto-suave" role="status">
        <Sparkles size={16} style={{ color: 'var(--acento)', flexShrink: 0, marginTop: 3 }} aria-hidden />
        {consejo}
      </p>
    )
  }

  return (
    <section className="tarjeta flex flex-col gap-2" aria-label="Lo que ve el sistema">
      <span className="etiqueta flex items-center gap-1.5" style={{ color: 'var(--acento)' }}>
        <Sparkles size={13} aria-hidden />
        Lo que veo hoy
      </span>
      <p className="text-[14.5px] leading-relaxed" role="status">
        {consejo}
      </p>
    </section>
  )
}
