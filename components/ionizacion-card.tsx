'use client'

import { Zap } from 'lucide-react'

interface Props {
  encendida: boolean
  cambiar: () => void
}

export function IonizacionCard({ encendida, cambiar }: Props) {
  return (
    <section
      className="rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5 flex flex-col gap-5"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Ionización del agua"
    >
      <div className="flex items-center gap-3">
        <Zap size={26} style={{ color: 'var(--oro)' }} aria-hidden />
        <h2 className="text-xl font-semibold">Agua ionizada</h2>
      </div>

      <p className="text-xl" style={{ color: 'var(--tinta-suave)' }}>
        El agua ionizada ayuda a que la planta aproveche mejor el riego.
      </p>

      <button
        onClick={cambiar}
        className="rounded-2xl py-4 text-xl font-bold border-4 transition-colors"
        style={
          encendida
            ? { background: 'var(--oro)', borderColor: 'var(--riesgo-medio)', color: 'white' }
            : { background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }
        }
        aria-pressed={encendida}
      >
        {encendida ? '⚡ ENCENDIDA — Tocar para apagar' : 'APAGADA — Tocar para encender'}
      </button>
    </section>
  )
}
