'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { FlaskConical, Play } from 'lucide-react'
import { EVENTO_ABRIR_PRUEBAS, MODO_DEMO } from '@/lib/modo'
import { HojaPruebas } from '@/components/demo/hoja-pruebas'
import { PuenteDemo } from '@/components/demo/puente-demo'

// La franja de la demostración pública: delgada y en un solo renglón, para
// que nadie confunda el cultivo simulado con una huerta de verdad sin
// quitarle espacio a la app. Dice también lo que sí es real: la IA y el clima. Su botón abre los escenarios de prueba: sin
// ellos, en un minuto de visita no se ve al sistema hacer nada.
//
// Dentro del celular de la vista de presentación no se ve (lo dice el panel
// de al lado); ahí solo queda el puente que recibe los escenarios.

export function FranjaDemo() {
  const ruta = usePathname()
  const [abierta, setAbierta] = useState(false)
  const cerrar = useCallback(() => setAbierta(false), [])

  // La bienvenida ("Ver al sistema regar") la abre con este evento.
  useEffect(() => {
    const abrir = () => setAbierta(true)
    window.addEventListener(EVENTO_ABRIR_PRUEBAS, abrir)
    return () => window.removeEventListener(EVENTO_ABRIR_PRUEBAS, abrir)
  }, [])

  if (!MODO_DEMO || /^\/(presentacion|proyector|proceso)/.test(ruta ?? '')) return null

  return (
    <>
      <PuenteDemo />
      <div role="note" className="franja-demo">
        <div className="mx-auto flex items-center justify-between gap-3 px-4" style={{ maxWidth: 672, minHeight: 44 }}>
          <span className="flex items-center gap-2 min-w-0 text-[13.5px]">
            <FlaskConical size={15} aria-hidden className="franja-demo-icono" />
            <span className="truncate">
              <strong>Simulación</strong>
              <span className="franja-demo-suave"> · IA y clima reales</span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => setAbierta(true)}
            aria-haspopup="dialog"
            aria-expanded={abierta}
            className="franja-demo-boton"
          >
            <Play size={13} aria-hidden fill="currentColor" />
            Pruébalo
          </button>
        </div>
      </div>
      {abierta && <HojaPruebas alCerrar={cerrar} />}
    </>
  )
}
