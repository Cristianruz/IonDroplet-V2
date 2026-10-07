'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogIn, X } from 'lucide-react'
import { NavInferior } from '@/components/ui/nav-inferior'
import { VolverArriba } from '@/components/ui/volver-arriba'
import { BurbujaAsistente } from '@/components/ia/burbuja-asistente'
import { GuiaInicio } from '@/components/ui/guia-inicio'
import { ProveedorDatos } from '@/hooks/datos-provider'
import { EVENTO_PIDE_SESION, leerSesion, olvidarSesion, sesionVigente } from '@/lib/sesion'
import { EVENTO_PIDE_VINCULO } from '@/lib/dueno'
import { VincularAparato } from '@/components/ia/vincular-aparato'

// Por ahora no se pide login (decisión del usuario, 18 sep 2026): se entra
// directo y el backend deja ver y operar. Si el backend vuelve a pedir la
// cuenta (REQUIERE_LOGIN=si), una operación sin sesión responde 401 y aquí
// aparece el aviso para entrar; nada más cambia.

const CADA_CUANTO_REVISAR_MS = 60_000

export function GuardiaSesion({ children }: { children: ReactNode }) {
  const ruta = usePathname()
  // Entrar, la vista de presentación, el proyector y el recorrido no llevan
  // la app alrededor: la presentación la enseña adentro de su propio celular.
  const esEntrar = ruta === '/entrar' || /^\/(presentacion|proyector|proceso)/.test(ruta ?? '')
  const [listo, setListo] = useState(false)
  const [pideSesion, setPideSesion] = useState(false)
  const [pideVinculo, setPideVinculo] = useState(false)

  useEffect(() => {
    const alPedir = () => setPideVinculo(true)
    window.addEventListener(EVENTO_PIDE_VINCULO, alPedir)
    return () => window.removeEventListener(EVENTO_PIDE_VINCULO, alPedir)
  }, [])

  useEffect(() => {
    if (esEntrar) return
    const revisar = () => {
      const vigente = sesionVigente(leerSesion())
      // El token vence solo; si la app se queda abierta, se nota aquí y se
      // sigue como visita en vez de sacar a la persona.
      if (!vigente && leerSesion()) olvidarSesion()
    }
    revisar()
    setListo(true)
    const cada = setInterval(revisar, CADA_CUANTO_REVISAR_MS)
    const alPedir = () => { revisar(); setPideSesion(true) }
    window.addEventListener(EVENTO_PIDE_SESION, alPedir)
    return () => {
      clearInterval(cada)
      window.removeEventListener(EVENTO_PIDE_SESION, alPedir)
    }
  }, [esEntrar])

  if (esEntrar) return <>{children}</>
  if (!listo) return null

  return (
    // Un solo proveedor arriba de todo: los datos sobreviven al cambio de
    // pantalla, así no hay que volver a pedirlos ni enseñar "Buscando…"
    <ProveedorDatos>
      {pideSesion && (
        <div
          role="alertdialog"
          aria-label="Hace falta entrar"
          className="fixed left-4 right-4 z-[60] panel-vidrio flex flex-col gap-3 mx-auto"
          style={{ bottom: 'calc(92px + env(safe-area-inset-bottom))', maxWidth: 480, padding: 16, borderRadius: 'var(--radio)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[14.5px] font-bold">
              Para regar o cambiar algo tienes que entrar con tu cuenta.
            </p>
            <button type="button" onClick={() => setPideSesion(false)} aria-label="Cerrar" className="boton boton-sutil" style={{ width: 44, height: 44, minHeight: 44, padding: 0, margin: -10, borderRadius: 999, flexShrink: 0 }}>
              <X size={18} aria-hidden />
            </button>
          </div>
          <p className="text-[13px] texto-suave">Como visita puedes ver todo, pero no mover el riego.</p>
          <Link href="/entrar" className="boton boton-primario boton-ancho">
            <LogIn size={17} aria-hidden />
            Entrar
          </Link>
        </div>
      )}

      {/* Desde internet, operar pide un aparato vinculado. */}
      {pideVinculo && (
        <div
          role="alertdialog"
          aria-label="Vincular este aparato"
          className="fixed left-4 right-4 z-[65] panel-vidrio flex flex-col gap-3 mx-auto"
          style={{ bottom: 'calc(92px + env(safe-area-inset-bottom))', maxWidth: 480, padding: 16, borderRadius: 'var(--radio)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[14.5px] font-bold">
              Para operar el riego desde internet, vincula este aparato con la computadora del riego.
            </p>
            <button type="button" onClick={() => setPideVinculo(false)} aria-label="Cerrar" className="boton boton-sutil" style={{ width: 44, height: 44, minHeight: 44, padding: 0, margin: -10, borderRadius: 999, flexShrink: 0 }}>
              <X size={18} aria-hidden />
            </button>
          </div>
          <p className="text-[13px] texto-suave">Sin vincular puedes consultar todo, pero no cambiar nada.</p>
          <VincularAparato compacto onVinculado={() => setTimeout(() => setPideVinculo(false), 1500)} />
        </div>
      )}

      {/* Hueco para que la barra fija de abajo no tape el final de la página */}
      <div style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom))' }}>{children}</div>
      <BurbujaAsistente />
      <VolverArriba />
      <NavInferior />
      <GuiaInicio />
    </ProveedorDatos>
  )
}
