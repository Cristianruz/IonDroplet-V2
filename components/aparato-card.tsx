'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export type EstadoAparato = 'bien' | 'tarde' | 'nunca' | 'apagado' | 'activo'

const COLOR: Record<EstadoAparato, string> = {
  bien: 'var(--verde)',
  activo: 'var(--agua)',
  tarde: 'var(--alerta)',
  nunca: 'var(--peligro)',
  apagado: '#8a978a',
}

interface Props {
  icono: string
  nombre: string
  /** Lo que el aparato está diciendo ahorita, en lenguaje llano. */
  detalle: string
  estado: EstadoAparato
  /** Etiqueta corta a la derecha, para bomba e ionizador. */
  etiqueta?: string
  /** Pasos para revisarlo. Solo se enseña el botón si algo anda mal. */
  pasos?: string[]
}

export function AparatoCard({ icono, nombre, detalle, estado, etiqueta, pasos }: Props) {
  const [abierto, setAbierto] = useState(false)
  const necesitaRevision = estado === 'tarde' || estado === 'nunca'

  return (
    <section
      className="rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 flex flex-col gap-4"
      style={{ background: 'var(--tarjeta)' }}
      aria-label={nombre}
    >
      <div className="flex items-start gap-4">
        <span className="text-4xl leading-none" aria-hidden>{icono}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span
              className="rounded-full"
              style={{ width: 16, height: 16, background: COLOR[estado], flexShrink: 0 }}
              aria-hidden
            />
            <h2 className="text-2xl font-bold leading-tight">{nombre}</h2>
          </div>
          <p className="text-xl mt-1" style={{ color: 'var(--tinta-suave)' }} role="status">
            {detalle}
          </p>
        </div>

        {etiqueta && (
          <span
            className="text-lg font-bold rounded-full px-3 py-1 whitespace-nowrap"
            style={{ background: '#e5e7e2', color: COLOR[estado] }}
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
            className="rounded-2xl py-5 text-xl font-bold border-4 flex items-center justify-center gap-3"
            style={{ background: 'white', borderColor: 'var(--alerta)', color: 'var(--alerta)' }}
          >
            CÓMO REVISARLO
            <ChevronDown
              size={24}
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
                <li key={i} className="flex gap-4 text-xl">
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
