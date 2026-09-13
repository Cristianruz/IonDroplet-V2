'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { NavInferior } from '@/components/nav-inferior'
import { VolverArriba } from '@/components/volver-arriba'
import { BurbujaAsistente } from '@/components/burbuja-asistente'
import { ProveedorDatos } from '@/hooks/datos-provider'
import { cerrarSesion, leerSesion, sesionVigente } from '@/lib/sesion'

// Sin sesión no se monta nada de la app: ni el sondeo al backend, que solo
// recibiría 401 cada 3 segundos, ni la barra de abajo. Se manda a /entrar.
//
// Esto es comodidad, no el candado. El candado está en el backend, que
// rechaza cualquier petición sin token válido.

const CADA_CUANTO_REVISAR_MS = 60_000

export function GuardiaSesion({ children }: { children: ReactNode }) {
  const ruta = usePathname()
  const esEntrar = ruta === '/entrar'
  const [dentro, setDentro] = useState(false)

  useEffect(() => {
    if (esEntrar) return
    if (!sesionVigente(leerSesion())) {
      window.location.replace('/entrar')
      return
    }
    setDentro(true)
    // El token vence solo; si la app se queda abierta, se nota aquí.
    const revisar = setInterval(() => {
      if (!sesionVigente(leerSesion())) cerrarSesion()
    }, CADA_CUANTO_REVISAR_MS)
    return () => clearInterval(revisar)
  }, [esEntrar])

  if (esEntrar) return <>{children}</>
  if (!dentro) return null

  return (
    // Un solo proveedor arriba de todo: los datos sobreviven al cambio de
    // pantalla, así no hay que volver a pedirlos ni enseñar "Buscando…"
    <ProveedorDatos>
      {/* Hueco para que la barra fija de abajo no tape el final de la página */}
      <div style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom))' }}>{children}</div>
      <BurbujaAsistente />
      <VolverArriba />
      <NavInferior />
    </ProveedorDatos>
  )
}
