'use client'

import { Droplets, TriangleAlert } from 'lucide-react'
import { haceCuanto } from '@/lib/tiempo'

// Antes esta tarjeta era un número de 72 px en mayúsculas gritando
// "TIERRA SECA". Se lee igual de bien a 34 px y en minúsculas, y deja
// que la pantalla enseñe algo más que un solo dato.

function estadoHumedad(h: number, umbral: number) {
  if (h < umbral) return { texto: 'Seca', detalle: 'Le falta agua', color: 'var(--alerta)' }
  if (h <= 75) return { texto: 'En buen punto', detalle: 'No necesita agua ahora', color: 'var(--verde)' }
  return { texto: 'Muy húmeda', detalle: 'Tiene agua de sobra', color: 'var(--agua)' }
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
    <section className="tarjeta flex flex-col gap-3" aria-label="Humedad de la tierra">
      <div className="flex items-center justify-between gap-2">
        <span className="etiqueta flex items-center gap-1.5">
          <Droplets size={13} aria-hidden />
          Humedad del suelo
        </span>
        {cuando && <span className="text-xs texto-apagado">{cuando}</span>}
      </div>

      {sinDato ? (
        <p className="text-sm texto-suave py-3">Esperando al sensor…</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            {/* Si el sensor lleva rato callado, el número se atenúa: sigue
                siendo el último dato real, pero ya no vale como "ahorita". */}
            <span
              className="dato"
              style={{ color: estado!.color, opacity: sensorActivo ? 1 : 0.45 }}
            >
              {Math.round(humedad!)}
              <span className="dato-unidad">%</span>
            </span>

            {sensorActivo ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: estado!.color }}>
                <span className="punto" style={{ background: estado!.color }} aria-hidden />
                {estado!.texto}
              </span>
            ) : (
              <span className="text-sm texto-suave">Esperando al sensor…</span>
            )}
          </div>

          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--pista)', opacity: sensorActivo ? 1 : 0.45 }}
            role="progressbar"
            aria-valuenow={Math.round(humedad!)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, humedad!))}%`, background: estado!.color }}
            />
          </div>

          {sensorActivo && <p className="text-sm texto-suave">{estado!.detalle}</p>}
        </>
      )}

      {!sensorActivo && !sinDato && (
        <p className="text-sm flex items-start gap-2" style={{ color: 'var(--alerta)' }}>
          <TriangleAlert size={15} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
          El sensor lleva rato sin mandar datos. Revisa que el aparato esté conectado.
        </p>
      )}
    </section>
  )
}
