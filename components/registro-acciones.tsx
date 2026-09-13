'use client'

import { Droplet, Zap, SlidersHorizontal, FlaskConical, Circle, type LucideIcon } from 'lucide-react'
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
const ICONOS: Record<string, LucideIcon> = {
  riego: Droplet,
  ionizacion: Zap,
  modo: SlidersHorizontal,
  fertirriego: FlaskConical,
}

// Quién lo mandó hacer, en lenguaje de rancho.
const ORIGENES: Record<string, string> = {
  usuario: 'lo hiciste tú',
  ia: 'lo recomendó el asistente',
  umbral: 'la tierra estaba seca',
  // El tope de minutos del backend: la bomba se apagó sola por seguridad.
  sistema: 'se apagó sola por seguridad',
}

export function RegistroAcciones({ acciones, hayMas, cargando, onVerMas, bombaEncendida = false }: Props) {
  // El riego más reciente sin duración es el que está en curso, pero solo si
  // la bomba sigue prendida. Si no, es uno que quedó abierto por un reinicio.
  const idRiegoEnCurso = bombaEncendida
    ? acciones.find(a => a.tipo === 'riego' && a.duracion_seg === null)?.id ?? null
    : null

  return (
    <section
      className="tarjeta flex flex-col gap-4"
      aria-label="Lo que ha pasado"
    >
      <h2 className="text-base font-semibold">Lo que ha pasado</h2>

      {cargando ? (
        <p className="text-base py-2.5" style={{ color: 'var(--tinta-suave)' }}>
          Buscando…
        </p>
      ) : acciones.length === 0 ? (
        <p className="text-base py-2.5" style={{ color: 'var(--tinta-suave)' }}>
          Todavía no hay nada registrado. Aquí van a salir los riegos y los cambios que se hagan.
        </p>
      ) : (
        <>
          <ul className="flex flex-col">
            {acciones.map((a, i) => (
              <li
                key={a.id}
                className="flex items-start gap-4 py-2.5"
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--pista)' }}
              >
                {(() => { const Icono = ICONOS[a.tipo] ?? Circle; return <Icono size={16} aria-hidden style={{ color: 'var(--tinta-suave)', flexShrink: 0, marginTop: 2 }} /> })()}
                <div>
                  <p
                    className="text-base font-bold"
                    style={a.id === idRiegoEnCurso ? { color: 'var(--agua)' } : undefined}
                  >
                    {a.id === idRiegoEnCurso ? 'Regando ahora' : (a.detalle ?? 'Sin detalle')}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--tinta-suave)' }}>
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
              className="rounded-lg py-2.5 text-sm font-bold border"
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
