'use client'

import { Zap } from 'lucide-react'

interface Props {
  encendida: boolean
  cambiar: () => void
}

export function IonizacionCard({ encendida, cambiar }: Props) {
  return (
    <section
      className="rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 flex flex-col gap-5"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Ionización del agua"
    >
      <div className="flex items-center gap-3">
        <Zap size={32} style={{ color: '#b8860b' }} aria-hidden />
        <h2 className="text-2xl font-semibold">Agua ionizada</h2>
      </div>

      <p className="text-xl" style={{ color: 'var(--tinta-suave)' }}>
        El agua ionizada ayuda a que la planta aproveche mejor el riego.
      </p>

      <button
        onClick={cambiar}
        className="rounded-2xl py-6 text-2xl font-bold border-4 transition-colors"
        style={
          encendida
            ? { background: '#b8860b', borderColor: '#8a6508', color: 'white' }
            : { background: 'white', borderColor: '#d6ddd6', color: 'var(--tinta-suave)' }
        }
        aria-pressed={encendida}
      >
        {encendida ? '⚡ ENCENDIDA — Tocar para apagar' : 'APAGADA — Tocar para encender'}
      </button>
    </section>
  )
}
