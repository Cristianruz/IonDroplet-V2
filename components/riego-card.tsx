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
    <section className="tarjeta flex flex-col gap-3" aria-label="Riego">
      {/* El estado va como punto y palabra, no como un banner de color a
          todo lo ancho. Cuando está regando el punto late; con eso basta. */}
      <div className="flex items-center justify-between gap-2">
        <span className="etiqueta flex items-center gap-1.5">
          <Waves size={13} aria-hidden />
          Riego
        </span>
        <span
          className={`flex items-center gap-1.5 text-sm font-semibold ${regando ? 'regando' : ''}`}
          style={{ color: regando ? 'var(--agua)' : 'var(--tinta-suave)' }}
          role="status"
        >
          <span
            className="punto"
            style={{ background: regando ? 'var(--agua)' : 'var(--apagado)' }}
            aria-hidden
          />
          {regando ? 'Regando ahora' : 'Sin regar'}
        </span>
      </div>

      {/* La razón, siempre. Es lo que convierte un tablero en un sistema que
          decide y te explica. */}
      <p className="text-sm texto-suave">{razon()}</p>

      {regando && aMano ? (
        <button
          type="button"
          onClick={terminarRiegoManual}
          className="boton boton-ancho text-white"
          style={{ background: 'var(--peligro)' }}
        >
          <Square size={15} aria-hidden />
          Detener riego
        </button>
      ) : regando ? (
        // Regando por decisión del sistema: no se ofrece detener desde aquí,
        // se detiene solo cuando la tierra llegue a su punto.
        <p className="text-sm" style={{ color: 'var(--tinta-suave)' }}>
          Se detiene solo cuando la tierra llegue a su punto.
        </p>
      ) : confirmando ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">
            ¿Riego ahora aunque el sistema no lo pida?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmando(false)
                regarAhora()
              }}
              className="boton text-white"
              style={{ background: 'var(--agua)' }}
            >
              Sí, riega
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className="boton boton-secundario">
              Mejor no
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="boton boton-secundario boton-ancho"
        >
          <Droplet size={15} aria-hidden />
          Regar ahora
        </button>
      )}
    </section>
  )
}
