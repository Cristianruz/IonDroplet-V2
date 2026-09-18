'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Eye, LogIn, X } from 'lucide-react'
import { NavInferior } from '@/components/nav-inferior'
import { VolverArriba } from '@/components/volver-arriba'
import { BurbujaAsistente } from '@/components/burbuja-asistente'
import { ProveedorDatos } from '@/hooks/datos-provider'
import { EVENTO_PIDE_SESION, leerSesion, olvidarSesion, sesionVigente } from '@/lib/sesion'

// Sin sesión se entra como VISITA: se ve todo el sistema, pero regar, cambiar
// el punto de riego, editar la parcela y la IA piden entrar. Es para que la
// gente pueda ver IonDroplet sin cuenta.
//
// Esto es comodidad, no el candado. El candado está en el backend, que
// rechaza cualquier operación sin token válido y a las visitas no les manda
// ni la ubicación de la parcela ni correos.

const CADA_CUANTO_REVISAR_MS = 60_000

export function GuardiaSesion({ children }: { children: ReactNode }) {
  const ruta = usePathname()
  const esEntrar = ruta === '/entrar'
  const [listo, setListo] = useState(false)
  const [visita, setVisita] = useState(true)
  const [pideSesion, setPideSesion] = useState(false)

  useEffect(() => {
    if (esEntrar) return
    const revisar = () => {
      const vigente = sesionVigente(leerSesion())
      // El token vence solo; si la app se queda abierta, se nota aquí y se
      // sigue como visita en vez de sacar a la persona.
      if (!vigente && leerSesion()) olvidarSesion()
      setVisita(!vigente)
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
      {visita && (
        <div className="max-w-5xl mx-auto px-4 pt-3">
          <p
            className="flex items-center justify-between gap-3 text-[13px] texto-suave"
            style={{
              padding: '8px 12px', borderRadius: 'var(--radio-sm)',
              background: 'var(--cristal-suave)', border: '1px solid var(--vidrio-filo)',
            }}
          >
            <span className="flex items-center gap-2">
              <Eye size={15} aria-hidden style={{ flexShrink: 0 }} />
              Estás viendo el sistema como visita.
            </span>
            <Link href="/entrar" className="font-bold whitespace-nowrap" style={{ color: 'var(--verde)' }}>
              Entrar
            </Link>
          </p>
        </div>
      )}

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
            <button type="button" onClick={() => setPideSesion(false)} aria-label="Cerrar" className="boton-sutil" style={{ padding: 4, minHeight: 0 }}>
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

      {/* Hueco para que la barra fija de abajo no tape el final de la página */}
      <div style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom))' }}>{children}</div>
      <BurbujaAsistente />
      <VolverArriba />
      <NavInferior />
    </ProveedorDatos>
  )
}
