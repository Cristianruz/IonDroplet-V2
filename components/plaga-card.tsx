'use client'

import Link from 'next/link'
import { Check, MessageCircle } from 'lucide-react'
import type { Plaga, Riesgo } from '@/lib/plagas'

const COLOR_RIESGO: Record<Riesgo, string> = {
  alto: 'var(--alerta)',
  medio: 'var(--riesgo-medio)',
  bajo: 'var(--apagado)',
}

// En la tarjeta destacada cabe la frase completa; en la lista compacta solo
// la palabra, como en el wireframe. "RIESGO ALTO" ahí desborda un teléfono
// angosto.
const TEXTO_RIESGO: Record<Riesgo, string> = {
  alto: 'RIESGO ALTO',
  medio: 'RIESGO MEDIO',
  bajo: 'RIESGO BAJO',
}

const TEXTO_CORTO: Record<Riesgo, string> = {
  alto: 'ALTO',
  medio: 'MEDIO',
  bajo: 'BAJO',
}

interface Props {
  plaga: Plaga
  riesgo: Riesgo
  /** La de mayor riesgo va destacada arriba; el resto en lista. */
  destacada?: boolean
  revisadaEl: Date | null
  onRevisar: () => void
}

export function PlagaCard({ plaga, riesgo, destacada = false, revisadaEl, onRevisar }: Props) {
  if (!destacada) {
    return (
      <div className="flex items-center justify-between gap-3 py-4" style={{ borderTop: '1px solid var(--pista)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl leading-none" aria-hidden>{plaga.icono}</span>
          <p className="text-xl font-bold">{plaga.nombre}</p>
        </div>
        <span
          className="text-lg font-bold rounded-full px-3 py-1 whitespace-nowrap"
          style={{ background: 'var(--pista)', color: COLOR_RIESGO[riesgo] }}
        >
          {TEXTO_CORTO[riesgo]}
        </span>
      </div>
    )
  }

  return (
    <section
      className="rounded-2xl p-5 sm:p-6 shadow-sm border-4 flex flex-col gap-5"
      style={{ background: 'var(--tarjeta)', borderColor: COLOR_RIESGO[riesgo] }}
      aria-label={`${plaga.nombre}, riesgo ${riesgo}`}
    >
      <div className="flex items-start gap-4">
        <span className="text-5xl leading-none" aria-hidden>{plaga.icono}</span>
        <div>
          <h2 className="text-2xl font-bold leading-tight">{plaga.nombre}</h2>
          <p className="text-xl font-bold" style={{ color: COLOR_RIESGO[riesgo] }} role="status">
            {TEXTO_RIESGO[riesgo]} esta semana
          </p>
        </div>
      </div>

      <div>
        <p className="text-lg font-bold" style={{ color: 'var(--tinta-suave)' }}>Cómo la reconoces</p>
        <p className="text-xl">{plaga.comoReconocerla}</p>
      </div>

      <div>
        <p className="text-lg font-bold" style={{ color: 'var(--tinta-suave)' }}>Qué hacer</p>
        <p className="text-xl">{plaga.queHacer}</p>
      </div>

      {/* Abre el asistente con la plaga ya escrita, como pide el wireframe. */}
      <Link
        href={`/asistente?pregunta=${encodeURIComponent(`¿Qué hago con ${plaga.nombre.toLowerCase()} en mi cultivo?`)}`}
        className="rounded-2xl py-4 text-lg font-bold border-4 flex items-center justify-center gap-3"
        style={{ background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }}
      >
        <MessageCircle size={24} aria-hidden />
        Preguntar al asistente
      </Link>

      {revisadaEl ? (
        <p className="text-xl font-bold flex items-center gap-3" style={{ color: 'var(--verde)' }} role="status">
          <Check size={28} aria-hidden />
          La revisaste el {revisadaEl.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
        </p>
      ) : (
        <button
          type="button"
          onClick={onRevisar}
          className="rounded-2xl py-5 text-xl font-bold text-white shadow-md active:scale-95 transition-transform"
          style={{ background: 'var(--verde)' }}
        >
          YA REVISÉ
        </button>
      )}
    </section>
  )
}
