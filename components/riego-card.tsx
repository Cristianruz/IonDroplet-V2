'use client'

import { useState } from 'react'
import { Waves, Droplet, Square } from 'lucide-react'
import type { EstadoEsp } from '@/hooks/use-iondroplet'

interface Props {
  estadoEsp: EstadoEsp
  humedad: number | null
  sensorActivo: boolean
  umbral: number | null
  regarAhora: () => void
  terminarRiegoManual: () => void
}

// El sistema decide, siempre. Antes había un interruptor de "¿quién decide?"
// con dos botones iguales, y eso le decía al agricultor que el sistema no era
// tan listo. Ahora la tarjeta no pregunta: cuenta lo que decidió y por qué.
//
// "Regar ahora" se queda como excepción, con borde y no relleno, porque hay
// casos que el sistema no puede saber (acaba de trasplantar, quiere lavar una
// línea) y porque si el sensor se muere, el automático no puede decidir nada.
export function RiegoCard({
  estadoEsp,
  humedad,
  sensorActivo,
  umbral,
  regarAhora,
  terminarRiegoManual,
}: Props) {
  const regando = estadoEsp.pumpState === 1
  const aMano = !estadoEsp.autoMode
  const [confirmando, setConfirmando] = useState(false)

  function razon() {
    if (aMano && regando) return 'Lo pediste tú. Cuando lo detengas, el sistema retoma el control.'
    if (!sensorActivo || humedad === null) {
      return 'No tengo lectura del sensor, así que no puedo decidir por mi cuenta. Si hace falta, riega tú.'
    }
    if (umbral === null) return `Tu tierra está al ${Math.round(humedad)}%.`
    return regando
      ? `Tu tierra bajó a ${Math.round(humedad)}%, abajo del punto de riego (${umbral}%).`
      : `Tu tierra está al ${Math.round(humedad)}%, arriba del punto de riego (${umbral}%).`
  }

  return (
    <section
      className="rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5 flex flex-col gap-4"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Riego"
    >
      <div className="flex items-center gap-3">
        <Waves size={26} style={{ color: 'var(--verde)' }} aria-hidden />
        <h2 className="text-xl font-semibold">Riego</h2>
      </div>

      <div
        className={`rounded-2xl py-4 text-center text-2xl font-bold text-white ${regando ? 'regando' : ''}`}
        style={{ background: regando ? 'var(--agua)' : 'var(--apagado)' }}
        role="status"
      >
        {regando ? '💧 REGANDO AHORA' : 'SIN REGAR'}
      </div>

      {/* La razón, siempre. Es lo que convierte un tablero en un sistema que
          decide y te explica. */}
      <p className="text-lg" style={{ color: 'var(--tinta-suave)' }}>
        {razon()}
      </p>

      {regando && aMano ? (
        <button
          type="button"
          onClick={terminarRiegoManual}
          className="rounded-2xl py-4 text-xl font-bold text-white shadow-md flex items-center justify-center gap-3"
          style={{ background: 'var(--peligro)' }}
        >
          <Square size={22} aria-hidden />
          DETENER RIEGO
        </button>
      ) : regando ? (
        // Regando por decisión del sistema: no se ofrece detener desde aquí,
        // se detiene solo cuando la tierra llegue a su punto.
        <p className="text-lg" style={{ color: 'var(--tinta-suave)' }}>
          Se detiene solo cuando la tierra llegue a su punto.
        </p>
      ) : confirmando ? (
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold">
            ¿Riego ahora aunque el sistema no lo pida?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setConfirmando(false)
                regarAhora()
              }}
              className="rounded-2xl py-4 text-lg font-bold text-white"
              style={{ background: 'var(--agua)' }}
            >
              Sí, riega
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="rounded-2xl py-4 text-lg font-bold border-4"
              style={{ background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }}
            >
              Mejor no
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="rounded-2xl py-4 text-lg font-bold border-4 flex items-center justify-center gap-3"
          style={{ background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }}
        >
          <Droplet size={22} aria-hidden />
          Regar ahora de todos modos
        </button>
      )}
    </section>
  )
}
