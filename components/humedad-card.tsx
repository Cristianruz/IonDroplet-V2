'use client'

import { Droplets } from 'lucide-react'

function estadoHumedad(h: number) {
  if (h < 40) return { texto: 'TIERRA SECA', detalle: 'Le falta agua a tu tierra', color: 'var(--alerta)' }
  if (h <= 75) return { texto: 'HUMEDAD BIEN', detalle: 'Tu tierra está en buen punto', color: 'var(--verde)' }
  return { texto: 'MUY HÚMEDA', detalle: 'Tu tierra tiene agua de sobra', color: 'var(--agua)' }
}

export function HumedadCard({ humedad, sensorActivo }: { humedad: number | null; sensorActivo: boolean }) {
  const sinDato = humedad === null
  const estado = sinDato ? null : estadoHumedad(humedad)

  return (
    <section
      className="rounded-3xl p-8 shadow-sm border border-black/5"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Humedad de la tierra"
    >
      <div className="flex items-center gap-3 mb-2">
        <Droplets size={32} style={{ color: 'var(--agua)' }} aria-hidden />
        <h2 className="text-2xl font-semibold">Humedad de la tierra</h2>
      </div>

      {sinDato ? (
        <p className="text-3xl font-bold py-8" style={{ color: 'var(--tinta-suave)' }}>
          Esperando al sensor…
        </p>
      ) : (
        <>
          <p className="font-bold leading-none" style={{ fontSize: '6rem', color: estado!.color }}>
            {Math.round(humedad!)}
            <span className="text-5xl">%</span>
          </p>
          <p className="text-3xl font-bold mt-3" style={{ color: estado!.color }}>
            {estado!.texto}
          </p>
          <p className="text-xl mt-1" style={{ color: 'var(--tinta-suave)' }}>
            {estado!.detalle}
          </p>

          <div
            className="mt-6 h-6 rounded-full overflow-hidden"
            style={{ background: '#e5e7e2' }}
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
