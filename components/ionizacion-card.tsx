'use client'

import { Zap } from 'lucide-react'

interface Props {
  encendida: boolean
  cambiar: () => void
}

export function IonizacionCard({ encendida, cambiar }: Props) {
  return (
    <section
      className="rounded-lg p-4 sm:p-5 border flex flex-col gap-4"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Ionización del agua"
    >
      <div className="flex items-center gap-3">
        <Zap size={18} style={{ color: 'var(--oro)' }} aria-hidden />
        <h2 className="text-base font-semibold">Agua ionizada</h2>
      </div>

      <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
        El agua ionizada ayuda a que la planta aproveche mejor el riego.
      </p>

      <button
        onClick={cambiar}
        className="rounded-lg py-2.5 text-base font-bold border transition-colors"
        style={
          encendida
            ? { background: 'var(--oro)', borderColor: 'var(--riesgo-medio)', color: 'white' }
            : { background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }
        }
        aria-pressed={encendida}
      >
        {encendida ? 'Encendida · tocar para apagar' : 'Apagada · tocar para encender'}
      </button>
    </section>
  )
}
