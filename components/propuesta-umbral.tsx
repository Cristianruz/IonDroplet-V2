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
      className="rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 flex flex-col gap-5"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Recomendación del asistente sobre el punto de riego"
    >
      <div className="flex items-center gap-3">
        <Sparkles size={30} style={{ color: 'var(--verde)' }} aria-hidden />
        <h2 className="text-2xl font-semibold">¿Le pregunto al asistente?</h2>
      </div>

      {propuesta === null ? (
        <>
          <p className="text-xl" style={{ color: 'var(--tinta-suave)' }}>
            Puede revisar tu cultivo, la humedad de los últimos días y la temporada, y decirte en
            qué punto conviene que riegue solo.
          </p>
          <button
            type="button"
            onClick={pedirPropuesta}
            disabled={pensando}
            className="rounded-2xl py-6 text-xl font-bold border-4 disabled:opacity-60"
            style={{ background: 'white', borderColor: 'var(--verde)', color: 'var(--verde)' }}
          >
            {pensando ? 'Pensando…' : 'Que me recomiende un punto de riego'}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-3">
            <p className="font-bold leading-none" style={{ fontSize: 'clamp(2.5rem, 13vw, 4rem)', color: 'var(--agua)' }}>
              {propuesta.sugerido}
              <span style={{ fontSize: '0.6em' }}>%</span>
            </p>
            {umbralActual !== null && (
              <p className="text-lg" style={{ color: 'var(--tinta-suave)' }}>
                ahorita está en {umbralActual}%
              </p>
            )}
          </div>

          <p className="text-xl">{propuesta.razon}</p>

          {propuesta.confianza !== null && propuesta.confianza < 50 && (
            <p className="text-lg font-semibold" style={{ color: 'var(--alerta)' }}>
              ⚠️ Va con poca seguridad: le faltan datos frescos del sensor. Tómalo como una idea,
              no como una orden.
            </p>
          )}

          <button
            type="button"
            onClick={aceptar}
            className="rounded-2xl py-7 text-2xl font-bold text-white shadow-md active:scale-95 transition-transform flex items-center justify-center gap-3"
            style={{ background: 'var(--verde)' }}
          >
            <Check size={30} aria-hidden />
            USAR ESTE PUNTO
          </button>
          <button
            type="button"
            onClick={descartar}
            className="rounded-2xl py-5 text-xl font-bold border-4"
            style={{ background: 'white', borderColor: '#d6ddd6', color: 'var(--tinta-suave)' }}
          >
            Dejarlo como está
          </button>
        </>
      )}

      {aviso && (
        <p
          className="text-xl font-semibold rounded-2xl p-4"
          style={{ background: '#fdf3e3', color: 'var(--alerta)' }}
          role="alert"
        >
          {aviso}
        </p>
      )}
    </section>
  )
}
