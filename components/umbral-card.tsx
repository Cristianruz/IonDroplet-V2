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
      className="rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 flex flex-col gap-5"
      style={{ background: 'var(--tarjeta)' }}
      aria-label="Punto de riego"
    >
      <h2 className="text-2xl font-semibold">¿Cuándo debe regar solo?</h2>

      <p className="text-xl" style={{ color: 'var(--tinta-suave)' }}>
        Riega solo si la tierra baja de:
      </p>

      {valor === null ? (
        <p className="text-2xl font-bold py-6" style={{ color: 'var(--tinta-suave)' }}>
          Esperando al sistema…
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => mover(-PASO)}
              disabled={valor <= MINIMO}
              className="rounded-2xl border-4 flex items-center justify-center disabled:opacity-40"
              style={{ width: 'clamp(64px, 20vw, 84px)', height: 'clamp(64px, 20vw, 84px)', flexShrink: 0, background: 'white', borderColor: '#d6ddd6', color: 'var(--tinta)' }}
              aria-label={`Bajar el punto de riego a ${Math.max(MINIMO, valor - PASO)} por ciento`}
            >
              <Minus size={40} aria-hidden />
            </button>

            <p className="font-bold leading-none" style={{ fontSize: 'clamp(2.5rem, 13vw, 4rem)', color: 'var(--agua)' }} role="status">
              {valor}
              <span style={{ fontSize: '0.6em' }}>%</span>
            </p>

            <button
              type="button"
              onClick={() => mover(PASO)}
              disabled={valor >= MAXIMO}
              className="rounded-2xl border-4 flex items-center justify-center disabled:opacity-40"
              style={{ width: 'clamp(64px, 20vw, 84px)', height: 'clamp(64px, 20vw, 84px)', flexShrink: 0, background: 'white', borderColor: '#d6ddd6', color: 'var(--tinta)' }}
              aria-label={`Subir el punto de riego a ${Math.min(MAXIMO, valor + PASO)} por ciento`}
            >
              <Plus size={40} aria-hidden />
            </button>
          </div>

          {humedad !== null && (
            <p className="text-xl" style={{ color: 'var(--tinta-suave)' }}>
              {humedad < valor
                ? `Su tierra está en ${Math.round(humedad)}%, o sea abajo de ese punto: le toca agua.`
                : `Su tierra está en ${Math.round(humedad)}%, todavía arriba de ese punto.`}
            </p>
          )}

          {cambiado && (
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="rounded-2xl py-6 text-2xl font-bold text-white shadow-md active:scale-95 transition-transform flex items-center justify-center gap-3 disabled:opacity-60"
              style={{ background: 'var(--verde)' }}
            >
              <Check size={28} aria-hidden />
              {guardando ? 'GUARDANDO…' : 'GUARDAR ESTE PUNTO'}
            </button>
          )}

          {aviso && (
            <p className="text-xl font-semibold" style={{ color: 'var(--tinta-suave)' }} role="status">
              {aviso}
            </p>
          )}
        </>
      )}
    </section>
  )
}
