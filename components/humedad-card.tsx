'use client'

import { Droplets } from 'lucide-react'
import { haceCuanto } from '@/lib/tiempo'

function estadoHumedad(h: number, umbral: number) {
  if (h < umbral) return { texto: 'TIERRA SECA', detalle: 'Le falta agua a tu tierra', color: 'var(--alerta)' }
  if (h <= 75) return { texto: 'HUMEDAD BIEN', detalle: 'Tu tierra está en buen punto', color: 'var(--verde)' }
  return { texto: 'MUY HÚMEDA', detalle: 'Tu tierra tiene agua de sobra', color: 'var(--agua)' }
}

interface Props {
  humedad: number | null
  sensorActivo: boolean
  ultimaLectura?: Date | null
  /** Debajo de este número la tierra se marca seca. Es el punto de riego. */
  umbral?: number
}

export function HumedadCard({ humedad, sensorActivo, ultimaLectura = null, umbral = 40 }: Props) {
  const sinDato = humedad === null
  const estado = sinDato ? null : estadoHumedad(humedad, umbral)
  const cuando = haceCuanto(ultimaLectura)

  return (
    <section
      className="rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Humedad de la tierra"
    >
      <div className="flex items-center gap-3 mb-2">
        <Droplets size={26} style={{ color: 'var(--agua)' }} aria-hidden />
        <h2 className="text-xl font-semibold">Humedad de la tierra</h2>
      </div>

      {sinDato ? (
        <p className="text-2xl font-bold py-6" style={{ color: 'var(--tinta-suave)' }}>
          Esperando al sensor…
        </p>
      ) : (
        <>
          {/* Si el sensor lleva rato callado, el número se atenúa: sigue siendo
              el último dato real, pero ya no es de fiar como "ahorita". */}
          {/* Enorme a propósito, pero sin desbordar un teléfono angosto:
              crece con la pantalla y se topa en 6rem. */}
          <p
            className="font-bold leading-none"
            style={{
              fontSize: 'clamp(3rem, 17vw, 4.5rem)',
              color: estado!.color,
              opacity: sensorActivo ? 1 : 0.5,
            }}
          >
            {Math.round(humedad!)}
            <span style={{ fontSize: '0.5em' }}>%</span>
          </p>

          {sensorActivo ? (
            <>
              <p className="text-2xl font-bold mt-2" style={{ color: estado!.color }}>
                {estado!.texto}
              </p>
              <p className="text-xl mt-1" style={{ color: 'var(--tinta-suave)' }}>
                {estado!.detalle}
              </p>
            </>
          ) : (
            <p className="text-2xl font-bold mt-2" style={{ color: 'var(--tinta-suave)' }}>
              Esperando al sensor…
            </p>
          )}

          <div
            className="mt-6 h-6 rounded-full overflow-hidden"
            style={{ background: 'var(--pista)', opacity: sensorActivo ? 1 : 0.5 }}
            role="progressbar"
            aria-valuenow={Math.round(humedad!)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, humedad!))}%`, background: estado!.color }}
            />
          </div>

          {/* Cada dato dice cuándo se midió. */}
          {cuando && (
            <p className="text-lg mt-3" style={{ color: 'var(--tinta-suave)' }}>
              {cuando}
            </p>
          )}
        </>
      )}

      {!sensorActivo && !sinDato && (
        <p className="mt-4 text-lg font-semibold" style={{ color: 'var(--alerta)' }}>
          ⚠️ El sensor lleva rato sin mandar datos. Revisa que el aparato esté conectado.
        </p>
      )}
    </section>
  )
}
