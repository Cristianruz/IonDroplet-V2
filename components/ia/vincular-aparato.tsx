'use client'

import { useState } from 'react'
import { Smartphone } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { guardarLlave } from '@/lib/dueno'

// Vincular este aparato con la llave del dueño, sin copiarla a mano.
//
// 1. Se pide un código: el backend lo imprime en SU ventana, en la
//    computadora del riego (nunca viaja en la respuesta).
// 2. Quien está frente a esa computadora lo escribe aquí y el aparato recibe
//    la llave. Ver seguridad/vincular.js en el backend.

interface Props {
  /** Se llama cuando el aparato ya quedó vinculado. */
  onVinculado?: () => void
  /** Versión compacta, para dentro del chat. */
  compacto?: boolean
}

export function VincularAparato({ onVinculado, compacto = false }: Props) {
  const [paso, setPaso] = useState<'inicio' | 'codigo' | 'listo'>('inicio')
  const [codigo, setCodigo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  async function pedirCodigo() {
    setOcupado(true)
    setAviso(null)
    try {
      const res = await apiFetch('/api/dueno/vincular', { method: 'POST' })
      const cuerpo = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAviso(cuerpo.error ?? 'No se pudo pedir el código.')
        return
      }
      setPaso('codigo')
    } catch {
      setAviso('No hay conexión con la computadora del riego.')
    } finally {
      setOcupado(false)
    }
  }

  async function canjear() {
    setOcupado(true)
    setAviso(null)
    try {
      const res = await apiFetch('/api/dueno/canjear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigo.trim() }),
      })
      const cuerpo = await res.json().catch(() => ({}))
      if (!res.ok || !cuerpo.llave) {
        setAviso(cuerpo.error ?? 'El código no es correcto.')
        return
      }
      guardarLlave(cuerpo.llave)
      setPaso('listo')
      onVinculado?.()
    } catch {
      setAviso('No hay conexión con la computadora del riego.')
    } finally {
      setOcupado(false)
    }
  }

  if (paso === 'listo') {
    return (
      <p className="text-base font-semibold" style={{ color: 'var(--verde)' }} role="status">
        Listo: este aparato ya puede usar el asistente, el análisis y el diagnóstico.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {paso === 'inicio' ? (
        <>
          {!compacto && (
            <p className="text-base texto-suave">
              Para usar la IA en este teléfono, vincúlalo con la computadora del riego. Se hace
              una sola vez.
            </p>
          )}
          <button type="button" onClick={pedirCodigo} disabled={ocupado} className="boton boton-primario">
            <Smartphone size={18} aria-hidden />
            {ocupado ? 'Pidiendo código…' : 'Vincular este aparato'}
          </button>
        </>
      ) : (
        <>
          <p className="text-base">
            En la computadora del riego, la ventana <strong>IonDroplet - Backend</strong> muestra
            un código de 6 dígitos. Escríbelo aquí; vale 5 minutos.
          </p>
          <input
            value={codigo}
            onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            aria-label="Código de 6 dígitos"
            className="campo text-center text-2xl tracking-[0.4em] font-bold"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={canjear}
              disabled={ocupado || codigo.length !== 6}
              className="boton boton-primario"
            >
              {ocupado ? 'Revisando…' : 'Vincular'}
            </button>
            <button type="button" onClick={pedirCodigo} disabled={ocupado} className="boton boton-secundario">
              Pedir otro
            </button>
          </div>
        </>
      )}
      {aviso && (
        <p className="aviso aviso-peligro" role="alert">
          {aviso}
        </p>
      )}
    </div>
  )
}
