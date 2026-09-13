'use client'

import { Sparkles, Check } from 'lucide-react'
import { usePropuestaUmbral } from '@/hooks/use-asistente'

interface Props {
  umbralActual: number | null
  /** Se llama cuando el agricultor acepta, para refrescar la pantalla. */
  onAplicado: () => void
}

// La IA propone; el agricultor decide. Mientras no toque el botón, la bomba
// sigue con el punto de riego que ya tenía.
export function PropuestaUmbral({ umbralActual, onAplicado }: Props) {
  const { propuesta, pensando, aviso, pedirPropuesta, aplicar, descartar } = usePropuestaUmbral()

  async function aceptar() {
    if (!propuesta) return
    if (await aplicar(propuesta.sugerido)) onAplicado()
  }

  return (
    <section
      className="tarjeta flex flex-col gap-4"
      aria-label="Recomendación del asistente sobre el punto de riego"
    >
      <div className="flex items-center gap-3">
        <Sparkles size={18} style={{ color: 'var(--verde)' }} aria-hidden />
        <h2 className="text-base font-semibold">¿Le pregunto al asistente?</h2>
      </div>

      {propuesta === null ? (
        <>
          <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
            Puede revisar tu cultivo, la humedad de los últimos días y la temporada, y decirte en
            qué punto conviene que riegue solo.
          </p>
          <button
            type="button"
            onClick={pedirPropuesta}
            disabled={pensando}
            className="rounded-lg py-2.5 text-base font-bold border disabled:opacity-60"
            style={{ borderColor: 'var(--verde)', color: 'var(--verde)' }}
          >
            {pensando ? 'Pensando…' : 'Que me recomiende un punto de riego'}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-3">
            <p className="font-bold leading-none" style={{ fontSize: 'clamp(2.25rem, 12vw, 3.25rem)', color: 'var(--agua)' }}>
              {propuesta.sugerido}
              <span style={{ fontSize: '0.6em' }}>%</span>
            </p>
            {umbralActual !== null && (
              <p className="text-sm" style={{ color: 'var(--tinta-suave)' }}>
                ahorita está en {umbralActual}%
              </p>
            )}
          </div>

          <p className="text-base">{propuesta.razon}</p>

          {propuesta.confianza !== null && propuesta.confianza < 50 && (
            <p className="text-sm font-semibold" style={{ color: 'var(--alerta)' }}>
              Va con poca seguridad: le faltan datos frescos del sensor. Tómalo como una idea,
              no como una orden.
            </p>
          )}

          <button
            type="button"
            onClick={aceptar}
            className="boton boton-primario boton-ancho"
            >
            <Check size={18} aria-hidden />
            Usar este punto
          </button>
          <button
            type="button"
            onClick={descartar}
            className="boton boton-secundario"
            style={{ color: 'var(--tinta-suave)' }}
          >
            Dejarlo como está
          </button>
        </>
      )}

      {aviso && (
        <p
          className="text-base font-semibold rounded-lg p-4"
          style={{ background: 'var(--fondo-alerta)', color: 'var(--alerta)' }}
          role="alert"
        >
          {aviso}
        </p>
      )}
    </section>
  )
}
