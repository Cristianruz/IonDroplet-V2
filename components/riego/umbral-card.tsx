'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Minus, Plus, Check } from 'lucide-react'

interface Props {
  umbral: number | null
  humedad: number | null
  guardando: boolean
  onGuardar: (nuevo: number) => Promise<boolean>
  /** Lo que va al pie de la tarjeta (la recomendación del asistente). */
  children?: ReactNode
}

const MINIMO = 10
const MAXIMO = 90
const PASO = 5

export function UmbralCard({ umbral, humedad, guardando, onGuardar, children }: Props) {
  const [valor, setValor] = useState<number | null>(umbral)
  const [tocado, setTocado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  // Mientras el usuario no haya tocado nada, el valor sigue al del sistema.
  useEffect(() => {
    if (!tocado) setValor(umbral)
  }, [umbral, tocado])

  const cambiado = valor !== null && umbral !== null && valor !== umbral

  function mover(delta: number) {
    setTocado(true)
    setAviso(null)
    setValor(v => Math.min(MAXIMO, Math.max(MINIMO, (v ?? 40) + delta)))
  }

  async function guardar() {
    if (valor === null) return
    const listo = await onGuardar(valor)
    if (listo) {
      setTocado(false)
      setAviso('Listo, ya quedó guardado.')
    } else {
      setAviso('No se pudo guardar. Revisa que el sistema esté conectado.')
    }
  }

  return (
    <section
      className="tarjeta flex flex-col gap-4"
      aria-label="Punto de riego"
    >
      <div className="flex flex-col gap-1">
        <h2 className="titulo-bloque">¿Cuándo debe regar solo?</h2>
        <p className="text-[15px] texto-suave">Cuando la tierra baje de este número, el riego empieza solo.</p>
      </div>

      {valor === null ? (
        <p className="text-base font-bold py-2.5" style={{ color: 'var(--tinta-suave)' }}>
          Esperando al sistema…
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => mover(-PASO)}
              disabled={valor <= MINIMO}
              className="boton boton-secundario"
              style={{ width: 60, height: 60, padding: 0, flexShrink: 0 }}
              aria-label={`Bajar el punto de riego a ${Math.max(MINIMO, valor - PASO)} por ciento`}
            >
              <Minus size={28} aria-hidden />
            </button>

            <p className="font-bold leading-none" style={{ fontSize: 48, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums' }} role="status">
              {valor}
              <span style={{ fontSize: '0.5em', color: 'var(--tinta-suave)' }}>%</span>
            </p>

            <button
              type="button"
              onClick={() => mover(PASO)}
              disabled={valor >= MAXIMO}
              className="boton boton-secundario"
              style={{ width: 60, height: 60, padding: 0, flexShrink: 0 }}
              aria-label={`Subir el punto de riego a ${Math.min(MAXIMO, valor + PASO)} por ciento`}
            >
              <Plus size={28} aria-hidden />
            </button>
          </div>

          {humedad !== null && (
            <p className="text-[15px] text-center" style={{ color: 'var(--tinta-suave)' }}>
              {humedad < valor
                ? `Tu tierra está en ${Math.round(humedad)}%, o sea abajo de ese punto: le toca agua.`
                : `Tu tierra está en ${Math.round(humedad)}%, todavía arriba de ese punto.`}
            </p>
          )}

          {cambiado && (
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="boton boton-primario boton-ancho"
              >
              <Check size={18} aria-hidden />
              {guardando ? 'Guardando…' : 'Guardar este punto'}
            </button>
          )}

          {aviso && (
            <p className="text-base font-semibold" style={{ color: 'var(--tinta-suave)' }} role="status">
              {aviso}
            </p>
          )}
        </>
      )}

      {children}
    </section>
  )
}
