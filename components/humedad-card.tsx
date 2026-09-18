'use client'

import { Droplets, TriangleAlert } from 'lucide-react'
import { haceCuanto } from '@/lib/tiempo'
import { colorEstado } from '@/lib/estilo'

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
              className="dato-grande"
              style={{ color: estado!.color, opacity: sensorActivo ? 1 : 0.45 }}
            >
              {Math.round(humedad!)}
              <span className="dato-unidad">%</span>
            </span>

            {/* El estado va en cápsula sólida: bajo el sol no se adivina
                a través del vidrio. */}
            {sensorActivo ? (
              <span className="capsula" style={colorEstado(estado!.color)}>
                {estado!.texto}
              </span>
            ) : (
              <span className="text-sm texto-apagado">Esperando al sensor…</span>
            )}
          </div>

          <div
            className="relative"
            style={{ opacity: sensorActivo ? 1 : 0.45 }}
            role="progressbar"
            aria-valuenow={Math.round(humedad!)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Humedad ${Math.round(humedad!)}%, punto de riego ${umbral}%`}
          >
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={{ background: 'var(--pista)', boxShadow: 'var(--sombra-hundida)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, humedad!))}%`,
                  background: estado!.color,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45)',
                }}
              />
            </div>
            {/* La raya del punto de riego: ahí se prende la bomba. */}
            <span
              aria-hidden
              className="absolute rounded-sm"
              style={{
                left: `${Math.min(100, Math.max(0, umbral))}%`,
                top: -3,
                width: 2,
                height: 16,
                background: 'var(--tinta)',
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            {sensorActivo ? <span className="text-sm texto-suave">{estado!.detalle}</span> : <span />}
            <span className="text-xs font-semibold texto-apagado">punto de riego {umbral}%</span>
          </div>
        </>
      )}

      {!sensorActivo && !sinDato && (
        <p className="text-sm font-semibold flex items-start gap-2" style={{ color: 'var(--alerta-texto)' }}>
          <TriangleAlert size={15} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
          El sensor lleva rato sin mandar datos. Revisa que el aparato esté conectado.
        </p>
      )}
    </section>
  )
}
