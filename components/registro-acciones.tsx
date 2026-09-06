'use client'

import { fechaCorta } from '@/lib/tiempo'
import type { Accion } from '@/hooks/use-registro'

interface Props {
  acciones: Accion[]
  hayMas: boolean
  cargando: boolean
  onVerMas: () => void
  /** Si la bomba está prendida ahorita, el riego más reciente sigue en curso. */
  bombaEncendida?: boolean
}

// Iconos de catálogo, definidos aquí y no sueltos en el JSX.
const ICONOS: Record<string, string> = {
  riego: '💧',
  ionizacion: '⚡',
  modo: '🌱',
}

// Quién lo mandó hacer, en lenguaje de rancho.
const ORIGENES: Record<string, string> = {
  usuario: 'lo hiciste tú',
  ia: 'lo recomendó el asistente',
  umbral: 'la tierra estaba seca',
}

export function RegistroAcciones({ acciones, hayMas, cargando, onVerMas, bombaEncendida = false }: Props) {
  // El riego más reciente sin duración es el que está en curso, pero solo si
  // la bomba sigue prendida. Si no, es uno que quedó abierto por un reinicio.
  const idRiegoEnCurso = bombaEncendida
    ? acciones.find(a => a.tipo === 'riego' && a.duracion_seg === null)?.id ?? null
    : null

  return (
    <section
      className="rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5 flex flex-col gap-5"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Lo que ha pasado"
    >
      <h2 className="text-xl font-semibold">Lo que ha pasado</h2>

      {cargando ? (
        <p className="text-xl py-4" style={{ color: 'var(--tinta-suave)' }}>
          Buscando…
        </p>
      ) : acciones.length === 0 ? (
        <p className="text-xl py-4" style={{ color: 'var(--tinta-suave)' }}>
          Todavía no hay nada registrado. Aquí van a salir los riegos y los cambios que se hagan.
        </p>
      ) : (
        <>
          <ul className="flex flex-col">
            {acciones.map((a, i) => (
              <li
                key={a.id}
                className="flex items-start gap-4 py-4"
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--pista)' }}
              >
                <span className="text-3xl leading-none" aria-hidden>
                  {ICONOS[a.tipo] ?? '🌱'}
                </span>
                <div>
                  <p
                    className="text-xl font-bold"
                    style={a.id === idRiegoEnCurso ? { color: 'var(--agua)' } : undefined}
                  >
                    {a.id === idRiegoEnCurso ? 'Regando ahora' : (a.detalle ?? 'Sin detalle')}
                  </p>
                  <p className="text-lg" style={{ color: 'var(--tinta-suave)' }}>
                    {a.id === idRiegoEnCurso ? `Empezó ${fechaCorta(a.fecha)}` : fechaCorta(a.fecha)}
                    {a.origen && ORIGENES[a.origen] ? ` · ${ORIGENES[a.origen]}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {hayMas && (
            <button
              type="button"
              onClick={onVerMas}
              className="rounded-2xl py-4 text-lg font-bold border-4"
              style={{ background: 'var(--tarjeta)', borderColor: 'var(--borde)', color: 'var(--tinta-suave)' }}
            >
              Ver más
            </button>
          )}
        </>
      )}
    </section>
  )
}
