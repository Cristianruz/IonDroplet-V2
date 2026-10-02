'use client'

import { Sparkles, Check } from 'lucide-react'
import { usePropuestaUmbral } from '@/hooks/use-asistente'

interface Props {
  umbralActual: number | null
  /** Se llama cuando el agricultor acepta, para refrescar la pantalla. */
  onAplicado: () => void
}

// La IA propone; el agricultor decide. Mientras no toque el botón, la bomba
// sigue con el punto de riego que ya tenía. Va dentro de la tarjeta del punto
// de riego, como ayuda para escoger el número, no como otra tarjeta más.
export function PropuestaUmbral({ umbralActual, onAplicado }: Props) {
  const { propuesta, pensando, aviso, pedirPropuesta, aplicar, descartar } = usePropuestaUmbral()

  async function aceptar() {
    if (!propuesta) return
    if (await aplicar(propuesta.sugerido)) onAplicado()
  }

  return (
    <div className="flex flex-col gap-3 pt-4" style={{ borderTop: '1px solid var(--borde)' }} aria-label="Recomendación del asistente">
      {propuesta === null ? (
        <button
          type="button"
          onClick={pedirPropuesta}
          disabled={pensando}
          className="boton boton-secundario boton-ancho"
          style={{ color: 'var(--acento-fuerte)' }}
        >
          <Sparkles size={17} aria-hidden />
          {pensando ? 'Pensando…' : '¿Qué número me recomiendas?'}
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-[14px] p-4" style={{ background: 'var(--acento-suave)' }}>
          <p className="flex items-center gap-2 flex-wrap font-semibold">
            <Sparkles size={17} style={{ color: 'var(--acento)' }} aria-hidden />
            Te recomiendo {propuesta.sugerido}%
            {umbralActual !== null && umbralActual !== propuesta.sugerido && (
              <span className="font-normal texto-suave">(ahora está en {umbralActual}%)</span>
            )}
          </p>
          <p className="text-[15px]">{propuesta.razon}</p>

          {propuesta.confianza !== null && propuesta.confianza < 50 && (
            <p className="text-sm font-semibold" style={{ color: 'var(--alerta-texto)' }}>
              Va con poca seguridad: le faltan datos frescos del sensor. Tómalo como una idea,
              no como una orden.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={aceptar} className="boton boton-primario">
              <Check size={18} aria-hidden />
              Usarlo
            </button>
            <button type="button" onClick={descartar} className="boton boton-secundario">
              Dejarlo así
            </button>
          </div>
        </div>
      )}

      {aviso && <p className="aviso" role="alert">{aviso}</p>}
    </div>
  )
}
