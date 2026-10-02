'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraficaHumedad } from '@/components/riego/grafica-humedad'
import { RegistroAcciones } from '@/components/riego/registro-acciones'
import { useHistorial, RANGOS, type RangoHistorial } from '@/hooks/use-historial'
import { useRegistro } from '@/hooks/use-registro'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { duracionLarga } from '@/lib/tiempo'
import { ConsejoIA } from '@/components/ia/consejo-ia'
import { EsqueletoGrafica, EsqueletoCifras, EsqueletoLista } from '@/components/ui/esqueletos'

export default function PantallaHistorial() {
  // Siete días de entrada: en un día casi no se ve el ir y venir del riego.
  const [rango, setRango] = useState<RangoHistorial>('7dias')
  const { puntos, totalLecturas, promedio, resumen, cargando, conectado, horas } = useHistorial(rango)
  const { estadoEsp } = useIonDroplet({ conHistorial: false })
  const registro = useRegistro(horas)
  const router = useRouter()

  // Sin conexión no hay historial que enseñar: se regresa al inicio en vez de
  // mostrar cifras vacías. La pestaña tampoco aparece en la barra.
  useEffect(() => {
    if (!conectado && !cargando) router.replace('/')
  }, [conectado, cargando, router])

  const etiquetaRango = RANGOS.find(r => r.id === rango)?.etiqueta ?? 'Hoy'

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4 pb-3 flex flex-col gap-4">
      <h1 className="titulo-pantalla">Historial</h1>

      <ConsejoIA pantalla="historial" />

      {/* Hoy / 7 días / 30 días: el mismo selector que en Cultivo. */}
      <div className="segmentado" role="group" aria-label="Qué tanto tiempo ver">
        {RANGOS.map(({ id, etiqueta }) => (
          <button key={id} type="button" onClick={() => setRango(id)} aria-pressed={rango === id}>
            {etiqueta}
          </button>
        ))}
      </div>

      {cargando ? (
        <>
          <EsqueletoGrafica />
          <EsqueletoCifras />
          <EsqueletoLista />
        </>
      ) : (
        <>
          <GraficaHumedad
            historial={puntos}
            titulo={`Humedad de la tierra · ${etiquetaRango.toLowerCase()}`}
            altura={320}
            riegos={registro.riegos}
          />

          {/* Las tres cifras del periodo, juntas en una tarjeta. */}
          <section className="tarjeta flex flex-col gap-3" aria-label={`Resumen de ${etiquetaRango.toLowerCase()}`}>
            <dl className="grid grid-cols-3 gap-3">
              <Cifra valor={promedio !== null ? `${Math.round(promedio)}%` : null} etiqueta="humedad promedio" />
              <Cifra valor={resumen ? String(resumen.riegos) : null} etiqueta={resumen && resumen.riegos === 1 ? 'riego' : 'riegos'} />
              <Cifra valor={resumen ? duracionLarga(resumen.segundos_agua) : null} etiqueta="de agua" />
            </dl>
            <p className="text-sm texto-apagado">
              {totalLecturas > 0
                ? `Sacado de ${totalLecturas.toLocaleString('es-MX')} mediciones del sensor.`
                : 'Todavía no hay mediciones en este tiempo.'}
              {resumen && resumen.sin_duracion > 0 &&
                ` Falta el tiempo de ${resumen.sin_duracion} ${resumen.sin_duracion === 1 ? 'riego que quedó' : 'riegos que quedaron'} sin cerrar.`}
              {!resumen && ' No se pudo leer el registro de riegos.'}
            </p>
          </section>

          <RegistroAcciones
            acciones={registro.acciones}
            hayMas={registro.hayMas}
            cargando={registro.cargando}
            onVerMas={registro.verMas}
            bombaEncendida={estadoEsp.pumpState === 1}
          />
        </>
      )}
    </main>
  )
}

// Un número que nadie ha medido todavía no se rellena: se dice que falta.
function Cifra({ valor, etiqueta }: { valor: string | null; etiqueta: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dd
        className="font-bold leading-none m-0"
        style={{
          // Un valor largo ("menos de 1 min") no cabe al tamaño de un número.
          fontSize: valor && valor.length > 6 ? 18 : 28,
          letterSpacing: '-.02em',
          fontVariantNumeric: 'tabular-nums',
          color: valor ? 'var(--tinta)' : 'var(--apagado)',
        }}
      >
        {valor ?? '-'}
      </dd>
      <dt className="text-sm texto-suave order-last">{etiqueta}</dt>
    </div>
  )
}
