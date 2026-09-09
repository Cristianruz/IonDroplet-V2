'use client'

import { useState } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'

export type EstadoAparato = 'bien' | 'tarde' | 'nunca' | 'apagado' | 'activo'

const COLOR: Record<EstadoAparato, string> = {
  bien: 'var(--verde)',
  activo: 'var(--agua)',
  tarde: 'var(--alerta)',
  nunca: 'var(--peligro)',
  apagado: 'var(--apagado)',
}

interface Props {
  icono: LucideIcon
  nombre: string
  /** Lo que el aparato está diciendo ahorita, en lenguaje llano. */
  detalle: string
  estado: EstadoAparato
  /** Etiqueta corta a la derecha, para bomba e ionizador. */
  etiqueta?: string
  /** Pasos para revisarlo. Solo se enseña el botón si algo anda mal. */
  pasos?: string[]
}

export function AparatoCard({ icono: Icono, nombre, detalle, estado, etiqueta, pasos }: Props) {
  const [abierto, setAbierto] = useState(false)
  const necesitaRevision = estado === 'tarde' || estado === 'nunca'

  return (
    <section
      className="rounded-lg p-4 sm:p-5 border flex flex-col gap-4"
      style={{ background: 'var(--tarjeta)' }}
      aria-label={nombre}
    >
      <div className="flex items-start gap-4">
        <Icono size={18} aria-hidden style={{ color: 'var(--tinta-suave)', flexShrink: 0 }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span
              className="rounded-full"
              style={{ width: 16, height: 16, background: COLOR[estado], flexShrink: 0 }}
              aria-hidden
            />
            <h2 className="text-base font-bold leading-tight">{nombre}</h2>
          </div>
          <p className="text-base mt-1" style={{ color: 'var(--tinta-suave)' }} role="status">
            {detalle}
          </p>
        </div>

        {etiqueta && (
          <span
            className="text-sm font-bold rounded-full px-3 py-1 whitespace-nowrap"
            style={{ background: 'var(--pista)', color: COLOR[estado] }}
          >
            {etiqueta}
          </span>
        )}
      </div>

      {necesitaRevision && pasos && pasos.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setAbierto(a => !a)}
            aria-expanded={abierto}
            className="rounded-lg py-2.5 text-sm font-bold border flex items-center justify-center gap-3"
            style={{ background: 'var(--tarjeta)', borderColor: 'var(--alerta)', color: 'var(--alerta)' }}
          >
            CÓMO REVISARLO
            <ChevronDown
              size={18}
              aria-hidden
              style={{
                transform: abierto ? 'rotate(180deg)' : 'none',
                // Sin esto un SVG gira desde la esquina, no desde su centro.
                transformBox: 'fill-box',
                transformOrigin: 'center',
                transition: 'transform .2s',
              }}
            />
          </button>

          {abierto && (
            <ol className="flex flex-col gap-3">
              {pasos.map((paso, i) => (
                <li key={i} className="flex gap-4 text-base">
                  <span
                    className="rounded-full flex items-center justify-center font-bold text-white"
                    style={{ width: 34, height: 34, background: 'var(--tinta-suave)', flexShrink: 0 }}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  {paso}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}
