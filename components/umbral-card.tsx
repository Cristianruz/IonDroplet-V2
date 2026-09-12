'use client'

import { useEffect, useState } from 'react'
import { Minus, Plus, Check } from 'lucide-react'

interface Props {
  umbral: number | null
  humedad: number | null
  guardando: boolean
  onGuardar: (nuevo: number) => Promise<boolean>
}

const MINIMO = 10
const MAXIMO = 90
const PASO = 5

export function UmbralCard({ umbral, humedad, guardando, onGuardar }: Props) {
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
      <h2 className="text-base font-semibold">¿Cuándo debe regar solo?</h2>

      <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
        Riega solo si la tierra baja de:
      </p>

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
              className="rounded-lg border flex items-center justify-center disabled:opacity-40"
              style={{ width: 'clamp(56px, 17vw, 68px)', height: 'clamp(56px, 17vw, 68px)', flexShrink: 0, borderColor: 'var(--borde)', color: 'var(--tinta)' }}
              aria-label={`Bajar el punto de riego a ${Math.max(MINIMO, valor - PASO)} por ciento`}
            >
              <Minus size={40} aria-hidden />
            </button>

            <p className="font-bold leading-none" style={{ fontSize: 'clamp(2.25rem, 12vw, 3.25rem)', color: 'var(--agua)' }} role="status">
              {valor}
              <span style={{ fontSize: '0.6em' }}>%</span>
            </p>

            <button
              type="button"
              onClick={() => mover(PASO)}
              disabled={valor >= MAXIMO}
              className="rounded-lg border flex items-center justify-center disabled:opacity-40"
              style={{ width: 'clamp(56px, 17vw, 68px)', height: 'clamp(56px, 17vw, 68px)', flexShrink: 0, borderColor: 'var(--borde)', color: 'var(--tinta)' }}
              aria-label={`Subir el punto de riego a ${Math.min(MAXIMO, valor + PASO)} por ciento`}
            >
              <Plus size={40} aria-hidden />
            </button>
          </div>

          {humedad !== null && (
            <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
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
    </section>
  )
}
