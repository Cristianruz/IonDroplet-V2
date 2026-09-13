'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { Droplets } from 'lucide-react'
import { API_URL } from '@/lib/api'
import { guardarSesion, leerSesion, sesionVigente } from '@/lib/sesion'

// Entrar con Google.
//
// Google solo dice QUIÉN eres. Si puedes entrar lo decide el backend, con la
// lista CORREOS_PERMITIDOS de su .env: tener Gmail no basta para regar la
// parcela de alguien más.
//
// OJO: Google solo acepta esta pantalla desde https o desde
// http://localhost. Desde el teléfono por la IP de la red (http://192.168…)
// el botón no funciona.

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

interface RespuestaGoogle {
  credential?: string
}

interface GoogleId {
  initialize: (opciones: {
    client_id: string
    callback: (r: RespuestaGoogle) => void
    ux_mode?: 'popup' | 'redirect'
  }) => void
  renderButton: (elemento: HTMLElement, opciones: Record<string, string | number>) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

export default function PantallaEntrar() {
  const boton = useRef<HTMLDivElement | null>(null)
  const [scriptListo, setScriptListo] = useState(false)
  const [entrando, setEntrando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  // Quien ya tiene sesión no tiene nada que hacer aquí.
  useEffect(() => {
    if (sesionVigente(leerSesion())) window.location.replace('/')
  }, [])

  const alResponder = useCallback(async (respuesta: RespuestaGoogle) => {
    if (!respuesta.credential) {
      setAviso('Google no mandó la cuenta. Inténtalo otra vez.')
      return
    }
    setEntrando(true)
    setAviso(null)
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credencial: respuesta.credential }),
      })
      const datos = await res.json().catch(() => ({}))
      if (res.status === 403) {
        setAviso('Esta cuenta de Google no tiene acceso. Pide que la agreguen a la lista del sistema.')
        return
      }
      if (res.status === 429) {
        setAviso('Demasiados intentos seguidos. Espera un minuto.')
        return
      }
      if (!res.ok || typeof datos.token !== 'string') {
        setAviso('No se pudo entrar. Revisa que el sistema esté encendido.')
        return
      }
      guardarSesion({
        token: datos.token,
        email: datos.usuario?.email ?? '',
        nombre: datos.usuario?.nombre ?? '',
        foto: datos.usuario?.foto ?? null,
      })
      window.location.replace('/')
    } catch {
      setAviso('No hay conexión con la computadora del riego.')
    } finally {
      setEntrando(false)
    }
  }, [])

  useEffect(() => {
    if (!scriptListo || !CLIENT_ID || !boton.current || !window.google) return
    window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: alResponder, ux_mode: 'popup' })
    window.google.accounts.id.renderButton(boton.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      locale: 'es',
      width: 280,
    })
  }, [scriptListo, alResponder])

  return (
    <main className="min-h-screen max-w-md mx-auto px-6 flex flex-col items-center justify-center gap-6 text-center">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setScriptListo(true)} />

      <Droplets size={48} style={{ color: 'var(--agua)' }} aria-hidden />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">IonDroplet</h1>
        <p className="text-base" style={{ color: 'var(--tinta-suave)' }}>
          Entra con tu cuenta de Google para ver y controlar tu parcela.
        </p>
      </div>

      {CLIENT_ID ? (
        <div ref={boton} aria-busy={entrando} style={{ minHeight: 44 }} />
      ) : (
        <p className="tarjeta text-base" role="alert">
          Falta configurar el inicio de sesión: pon <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> en el archivo{' '}
          <code>.env.local</code> de la aplicación y vuelve a construirla.
        </p>
      )}

      {entrando && (
        <p className="text-base" role="status">
          Entrando…
        </p>
      )}
      {aviso && (
        <p className="text-base font-semibold" role="alert" style={{ color: 'var(--peligro)' }}>
          {aviso}
        </p>
      )}
    </main>
  )
}
