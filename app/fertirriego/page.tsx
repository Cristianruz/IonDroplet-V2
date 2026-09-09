'use client'

import { useState } from 'react'
import { FlaskConical, Plus, Trash2, X } from 'lucide-react'
import { useFertirriego } from '@/hooks/use-fertirriego'
import { FertirriegoForm } from '@/components/fertirriego-form'
import { AvisoSinConexion } from '@/components/aviso-sin-conexion'
import { Aparece } from '@/components/aparece'
import { nombreNutriente } from '@/lib/nutrientes'
import { etapaPorId } from '@/lib/cultivos'
import { fechaCorta } from '@/lib/tiempo'

// Lo que se le ha puesto a la parcela. Captura a mano, porque no hay sonda
// que lo mida solo.
//
// Lo que hace que esto valga más que un cuaderno: cada aplicación guarda la
// ETAPA del cultivo en que se hizo. Dentro de tres meses la parcela va a
// estar en otra etapa, y el registro sigue diciendo en cuál se aplicó.

export default function PantallaFertirriego() {
  const { eventos, resumen, cargando, guardando, conectado, guardar, borrar } = useFertirriego(90)
  const [anotando, setAnotando] = useState(false)
  const [borrandoId, setBorrandoId] = useState<number | null>(null)

  return (
    <main className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-4">
      <h1 className="text-xl font-bold leading-tight">Lo que le he puesto</h1>

      {!conectado && !cargando && <AvisoSinConexion />}

      {!anotando && (
        <button
          type="button"
          onClick={() => setAnotando(true)}
          className="w-full rounded-lg py-3 text-lg font-bold text-white transition-transform flex items-center justify-center gap-3"
          style={{ background: 'var(--verde)' }}
        >
          <Plus size={18} aria-hidden />
          Anotar una aplicación
        </button>
      )}

      {anotando && (
        <>
          <button
            type="button"
            onClick={() => setAnotando(false)}
            className="self-end text-sm font-semibold flex items-center gap-1.5"
            style={{ color: 'var(--tinta-suave)' }}
          >
            <X size={16} aria-hidden />
            Cancelar
          </button>
          <FertirriegoForm guardando={guardando} onGuardar={guardar} onListo={() => setAnotando(false)} />
        </>
      )}

      {/* Resumen: lo que se ha aplicado en los últimos 90 días, sumado por
          nutriente. Es la vista que ningún cuaderno da. */}
      {resumen && resumen.totales.eventos > 0 && (
        <Aparece>
          <section
            className="rounded-lg p-4 sm:p-5 border flex flex-col gap-4"
            style={{ background: 'var(--tarjeta)' }}
            aria-label="Resumen de los últimos 90 días"
          >
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FlaskConical size={16} style={{ color: 'var(--verde)' }} aria-hidden />
              En los últimos 3 meses
            </h2>

            <div className="flex flex-wrap gap-3">
              {resumen.porNutriente.map(n => (
                <div
                  key={n.nutriente + n.unidad}
                  className="rounded-lg px-3.5 py-2.5 flex flex-col"
                  style={{ background: 'var(--fondo)', minWidth: 140 }}
                >
                  <span className="text-base" style={{ color: 'var(--tinta-suave)' }}>
                    {nombreNutriente(n.nutriente)}
                  </span>
                  <span className="text-xl font-bold" style={{ color: 'var(--verde)' }}>
                    {n.total === null ? '—' : n.total.toLocaleString('es-MX')}
                    <span className="text-sm font-semibold ml-1">{n.unidad}</span>
                  </span>
                  <span className="text-base" style={{ color: 'var(--tinta-suave)' }}>
                    en {n.eventos} {n.eventos === 1 ? 'vez' : 'veces'}
                  </span>
                </div>
              ))}
            </div>

            {/* Honestidad: si no capturó los litros, no se puede decir en qué
                concentración quedó. Se dice, no se estima. */}
            {resumen.totales.sin_volumen > 0 && (
              <p className="text-base pt-1" style={{ color: 'var(--tinta-suave)', borderTop: '1px solid var(--pista)' }}>
                {resumen.totales.sin_volumen === resumen.totales.eventos
                  ? 'No anotaste cuánta agua llevaron, así que no puedo decirte en qué concentración quedó.'
                  : `${resumen.totales.sin_volumen} de ${resumen.totales.eventos} aplicaciones no tienen litros anotados.`}
              </p>
            )}
          </section>
        </Aparece>
      )}

      {/* Historial */}
      <section className="flex flex-col gap-3" aria-label="Historial de aplicaciones">
        <h2 className="text-base font-semibold">Historial</h2>

        {cargando ? (
          <div className="esqueleto" style={{ width: '100%', height: 90 }} aria-hidden />
        ) : eventos.length === 0 ? (
          <div
            className="rounded-lg p-4 text-center flex flex-col gap-2"
            style={{ background: 'var(--tarjeta)', boxShadow: 'var(--sombra-tarjeta)' }}
          >
            <p className="text-base font-semibold">Todavía no has anotado nada</p>
            <p className="text-sm" style={{ color: 'var(--tinta-suave)' }}>
              Cada vez que le eches algo a la parcela, anótalo aquí. Con el tiempo vas a poder ver
              qué le diste en cada etapa del cultivo.
            </p>
          </div>
        ) : (
          eventos.map((e, i) => (
            <Aparece key={e.id} retraso={Math.min(i * 40, 200)}>
              <article
                className="rounded-lg p-4 border flex flex-col gap-2"
                style={{ background: 'var(--tarjeta)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-base font-bold">{fechaCorta(e.aplicado)}</span>
                    {e.etapa && (
                      <span className="text-base" style={{ color: 'var(--tinta-suave)' }}>
                        El cultivo iba en {etapaPorId(e.etapa)?.nombre.toLowerCase() ?? e.etapa}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setBorrandoId(e.id)
                      await borrar(e.id)
                      setBorrandoId(null)
                    }}
                    disabled={borrandoId === e.id}
                    aria-label={`Borrar la aplicación del ${fechaCorta(e.aplicado)}`}
                    className="rounded-md p-3 transition-transform disabled:opacity-50"
                    style={{ background: 'var(--fondo)', color: 'var(--tinta-suave)' }}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {e.nutrientes.map(n => (
                    <span
                      key={n.nutriente}
                      className="rounded-md px-3 py-2 text-sm font-semibold"
                      style={{ background: 'var(--pista)', color: 'var(--tinta)' }}
                    >
                      {nombreNutriente(n.nutriente)}
                      {n.cantidad !== null && ` · ${n.cantidad}${n.unidad ?? ''}`}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-base" style={{ color: 'var(--tinta-suave)' }}>
                  {e.volumen_litros !== null && <span>{e.volumen_litros.toLocaleString('es-MX')} litros de agua</span>}
                  {e.duracion_min !== null && <span>{e.duracion_min} minutos</span>}
                  {e.ec_ds_m !== null && <span>Sales {e.ec_ds_m} dS/m</span>}
                  {e.ph !== null && <span>pH {e.ph}</span>}
                </div>

                {e.notas && <p className="text-sm">{e.notas}</p>}
              </article>
            </Aparece>
          ))
        )}
      </section>
    </main>
  )
}
