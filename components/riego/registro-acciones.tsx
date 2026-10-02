'use client'

import { Droplet, Zap, SlidersHorizontal, FlaskConical, Circle, Gauge, Sparkles, type LucideIcon } from 'lucide-react'
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
  umbral: Gauge,
  agente: Sparkles,
}

// Quién lo mandó hacer, en lenguaje de rancho.
const ORIGENES: Record<string, string> = {
  usuario: 'lo hiciste tú',
  ia: 'lo decidió la IA',
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

  // El aparato prende la ionización junto con la bomba, y la bitácora guarda
  // las dos cosas. En pantalla va un solo renglón: "Riego de 27 minutos ·
  // con agua ionizada", en vez de dos renglones casi iguales.
  const riegos = acciones.filter(a => a.tipo === 'riego')
  const conIonizacion = new Set<number>()
  const visibles = acciones.filter(a => {
    if (a.tipo !== 'ionizacion' || a.duracion_seg === null) return true
    const pareja = riegos.find(r => Math.abs(r.fecha.getTime() - a.fecha.getTime()) < 5000)
    if (!pareja) return true
    conIonizacion.add(pareja.id)
    return false
  })

  return (
    <section
      className="tarjeta flex flex-col gap-3"
      aria-label="Lo que ha pasado"
    >
      <h2 className="titulo-bloque">Lo que ha pasado</h2>

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
            {visibles.map((a, i) => (
              <li
                key={a.id}
                className="flex items-start gap-3.5 py-3"
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--borde)' }}
              >
                {(() => { const Icono = ICONOS[a.tipo] ?? Circle; return <Icono size={18} aria-hidden style={{ color: a.tipo === 'riego' ? 'var(--agua)' : 'var(--tinta-suave)', flexShrink: 0, marginTop: 2 }} /> })()}
                <div className="min-w-0">
                  <p
                    className="text-[15px] font-semibold"
                    style={a.id === idRiegoEnCurso ? { color: 'var(--agua)' } : undefined}
                  >
                    {a.id === idRiegoEnCurso ? 'Regando ahora' : (a.detalle ?? 'Sin detalle')}
                    {conIonizacion.has(a.id) && <span className="font-normal texto-suave"> · con agua ionizada</span>}
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
              className="boton boton-secundario"
              style={{ color: 'var(--tinta-suave)' }}
            >
              Ver más
            </button>
          )}
        </>
      )}
    </section>
  )
}
