'use client'

import { useState } from 'react'
import { GraficaHumedad } from '@/components/grafica-humedad'
import { RegistroAcciones } from '@/components/registro-acciones'
import { useHistorial, RANGOS, type RangoHistorial } from '@/hooks/use-historial'
import { useRegistro } from '@/hooks/use-registro'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { duracionLarga } from '@/lib/tiempo'
import { Aparece } from '@/components/aparece'
import { EsqueletoGrafica, EsqueletoCifras, EsqueletoLista } from '@/components/esqueletos'
import { AvisoSinConexion } from '@/components/aviso-sin-conexion'

export default function PantallaHistorial() {
  const [rango, setRango] = useState<RangoHistorial>('hoy')
  const { puntos, totalLecturas, promedio, resumen, cargando, conectado, horas } = useHistorial(rango)
  const { estadoEsp } = useIonDroplet({ conHistorial: false })
  const registro = useRegistro(horas)

  const etiquetaRango = RANGOS.find(r => r.id === rango)?.etiqueta ?? 'Hoy'

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      <h1 className="text-3xl font-bold leading-tight">Historial</h1>

      {!conectado && !cargando && <AvisoSinConexion />}

      {/* Hoy / 7 días / 30 días */}
      <div className="grid grid-cols-3 gap-3" role="group" aria-label="Qué tanto tiempo ver">
        {RANGOS.map(({ id, etiqueta }) => {
          const activo = rango === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setRango(id)}
              className="rounded-2xl py-5 text-xl font-bold border-4 transition-colors"
              style={
                activo
                  ? { background: 'var(--verde)', borderColor: 'var(--verde-fuerte)', color: 'white' }
                  : { background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }
              }
              aria-pressed={activo}
            >
              {etiqueta}
            </button>
          )
        })}
      </div>

      {cargando ? (
        <>
          <EsqueletoGrafica />
          <EsqueletoCifras />
          <EsqueletoLista />
        </>
      ) : (
        <>
          <Aparece><GraficaHumedad
            historial={puntos}
            titulo={`Humedad de la tierra · ${etiquetaRango.toLowerCase()}`}
            altura={320}
            riegos={registro.riegos}
          /></Aparece>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Cifra
              valor={promedio !== null ? `${Math.round(promedio)}%` : null}
              etiqueta="de humedad en promedio"
              nota={
                totalLecturas > 0
                  ? `Sacado de ${totalLecturas.toLocaleString('es-MX')} mediciones`
                  : 'Todavía no hay mediciones en este tiempo'
              }
            />
            <Cifra
              valor={resumen ? String(resumen.riegos) : null}
              etiqueta={resumen && resumen.riegos === 1 ? 'riego' : 'riegos'}
              nota={
                !resumen
                  ? 'No se pudo leer el registro'
                  : resumen.riegos === 0
                    ? 'No se ha regado en este tiempo'
                    : 'Contados desde que quedó listo el registro'
              }
            />
            <Cifra
              valor={resumen ? duracionLarga(resumen.segundos_agua) : null}
              etiqueta="de agua"
              nota={
                !resumen
                  ? 'No se pudo leer el registro'
                  : resumen.sin_duracion > 0
                    ? `Falta el tiempo de ${resumen.sin_duracion} ${resumen.sin_duracion === 1 ? 'riego que quedó' : 'riegos que quedaron'} sin cerrar`
                    : 'Sumando lo que duró cada riego'
              }
            />
          </div>

          <Aparece retraso={60}><RegistroAcciones
            acciones={registro.acciones}
            hayMas={registro.hayMas}
            cargando={registro.cargando}
            onVerMas={registro.verMas}
            bombaEncendida={estadoEsp.pumpState === 1}
          /></Aparece>
        </>
      )}
    </main>
  )
}

// Un número que nadie ha medido todavía no se rellena: se dice que falta.
function Cifra({ valor, etiqueta, nota }: { valor: string | null; etiqueta: string; nota: string }) {
  return (
    <section
      className="rounded-3xl p-5 sm:p-6 shadow-sm border border-black/5"
      style={{ background: 'var(--tarjeta)' }}
      aria-label={etiqueta}
    >
      <p
        className="font-bold leading-none"
        style={{
          // Un valor largo ("menos de 1 min") no cabe al tamaño de un número.
          fontSize: valor && valor.length > 7 ? 'clamp(1.5rem, 8vw, 2rem)' : 'clamp(2.25rem, 11vw, 3rem)',
          color: valor ? 'var(--agua)' : 'var(--apagado)',
        }}
      >
        {valor ?? '—'}
      </p>
      <p className="text-xl font-semibold mt-2">{etiqueta}</p>
      <p className="text-lg mt-1" style={{ color: 'var(--tinta-suave)' }}>{nota}</p>
    </section>
  )
}
