'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { API_URL } from '@/lib/api'

export type Pantalla = 'inicio' | 'parcela' | 'historial' | 'plagas'

// La lectura del sistema, en una o dos frases, arriba de cada pantalla.
// El contexto lo arma el servidor con el sensor, el clima, el cultivo y su
// etapa; la app solo dice de qué pantalla se trata. Si le falta un dato, lo
// dice en vez de suponerlo — igual que el resto del asistente.

interface Props {
  pantalla: Pantalla
  /** En Inicio va grande y con fondo; en las demás, una línea discreta. */
  destacado?: boolean
}

export function ConsejoIA({ pantalla, destacado = false }: Props) {
  const [consejo, setConsejo] = useState<string | null>(null)
  const [pensando, setPensando] = useState(true)
  const [fallo, setFallo] = useState(false)

  const pedir = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/ai/consejo?pantalla=${pantalla}`)
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
  }, [pedir])

  // Si el asistente no pudo opinar, la pantalla sigue sirviendo igual: no se
  // enseña un hueco ni un error que no le importa al agricultor.
  if (fallo) return null

  if (pensando) {
    return destacado ? (
      <div
        className="rounded-2xl p-5 sm:p-6 border border-black/5 flex flex-col gap-3"
        style={{ background: 'var(--tarjeta)', boxShadow: 'var(--sombra-tarjeta)' }}
      >
        <div className="esqueleto" style={{ width: '40%', height: 20 }} aria-hidden />
        <div className="esqueleto" style={{ width: '100%', height: 18 }} aria-hidden />
        <div className="esqueleto" style={{ width: '75%', height: 18 }} aria-hidden />
      </div>
    ) : (
      <div className="esqueleto" style={{ width: '85%', height: 18 }} aria-hidden />
    )
  }

  if (!consejo) return null

  if (!destacado) {
    return (
      <p
        className="text-base flex items-start gap-2"
        style={{ color: 'var(--tinta-suave)' }}
        role="status"
      >
        <Sparkles size={18} style={{ color: 'var(--verde)', flexShrink: 0, marginTop: 3 }} aria-hidden />
        {consejo}
      </p>
    )
  }

  return (
    <section
      className="rounded-2xl p-5 sm:p-6 flex flex-col gap-2"
      style={{
        background: 'var(--tarjeta)',
        boxShadow: 'var(--sombra-tarjeta)',
        // Un filo verde a la izquierda: se distingue de las tarjetas de datos
        // sin necesidad de un color de fondo distinto.
        borderLeft: '5px solid var(--verde)',
      }}
      aria-label="Lo que ve el sistema"
    >
      <div className="flex items-center gap-2">
        <Sparkles size={20} style={{ color: 'var(--verde)' }} aria-hidden />
        <h2 className="text-base font-bold uppercase tracking-wide" style={{ color: 'var(--verde)' }}>
          Lo que veo hoy
        </h2>
      </div>
      <p className="text-xl leading-snug" role="status">
        {consejo}
      </p>
    </section>
  )
}
