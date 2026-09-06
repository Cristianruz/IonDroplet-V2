'use client'

import { Waves, Hand, Sparkles } from 'lucide-react'
import type { EstadoEsp } from '@/hooks/use-iondroplet'

interface Props {
  estadoEsp: EstadoEsp
  cambiarModo: (automatico: boolean) => void
  cambiarBomba: (encender: boolean) => void
}

export function RiegoCard({ estadoEsp, cambiarModo, cambiarBomba }: Props) {
  const regando = estadoEsp.pumpState === 1

  return (
    <section
      className="rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 flex flex-col gap-6"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Control de riego"
    >
      <div className="flex items-center gap-3">
        <Waves size={32} style={{ color: 'var(--verde)' }} aria-hidden />
        <h2 className="text-2xl font-semibold">Riego</h2>
      </div>

      {/* Estado actual, imposible de no ver */}
      <div
        className={`rounded-2xl py-5 text-center text-3xl font-bold text-white ${regando ? 'regando' : ''}`}
        style={{ background: regando ? 'var(--agua)' : 'var(--apagado)' }}
        role="status"
      >
        {regando ? '💧 REGANDO AHORA' : 'SIN REGAR'}
      </div>

      {/* Selector de modo: dos botones grandes, el activo resaltado */}
      <div>
        <p className="text-xl mb-3" style={{ color: 'var(--tinta-suave)' }}>
          ¿Quién decide cuándo regar?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => cambiarModo(true)}
            className="rounded-2xl py-5 px-4 text-xl font-bold border-4 transition-colors flex items-center justify-center gap-2"
            style={
              estadoEsp.autoMode
                ? { background: 'var(--verde)', borderColor: 'var(--verde-fuerte)', color: 'white' }
                : { background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }
            }
            aria-pressed={estadoEsp.autoMode}
          >
            <Sparkles size={26} aria-hidden /> Solo (automático)
          </button>
          <button
            onClick={() => cambiarModo(false)}
            className="rounded-2xl py-5 px-4 text-xl font-bold border-4 transition-colors flex items-center justify-center gap-2"
            style={
              !estadoEsp.autoMode
                ? { background: 'var(--verde)', borderColor: 'var(--verde-fuerte)', color: 'white' }
                : { background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }
            }
            aria-pressed={!estadoEsp.autoMode}
          >
            <Hand size={26} aria-hidden /> Yo decido
          </button>
        </div>
      </div>

      {estadoEsp.autoMode ? (
        <p className="text-xl text-center py-4" style={{ color: 'var(--tinta-suave)' }}>
          El sistema riega solo cuando la tierra lo necesita. No tienes que hacer nada. 🌱
        </p>
      ) : (
        <button
          onClick={() => cambiarBomba(!regando)}
          className="rounded-2xl py-8 text-3xl font-bold text-white shadow-md active:scale-95 transition-transform"
          style={{ background: regando ? 'var(--peligro)' : 'var(--agua)' }}
        >
          {regando ? '⏹ DETENER RIEGO' : '💧 REGAR AHORA'}
        </button>
      )}
    </section>
  )
}
