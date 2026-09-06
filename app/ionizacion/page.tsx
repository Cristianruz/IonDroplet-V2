'use client'

import { useIonDroplet } from '@/hooks/use-iondroplet'
import { IonizacionCard } from '@/components/ionizacion-card'
import { AvisoSinConexion } from '@/components/aviso-sin-conexion'

export default function PantallaIonizacion() {
  const { conectado, ionizacion, cambiarIonizacion } = useIonDroplet()

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* El título lo pone la propia tarjeta, con su icono. */}
      {!conectado && <AvisoSinConexion />}

      <IonizacionCard encendida={ionizacion} cambiar={cambiarIonizacion} />

      <p className="text-lg" style={{ color: 'var(--tinta-suave)' }}>
        El ionizador no reporta su estado por sí solo: aquí se ve lo último que se le pidió desde
        esta aplicación.
      </p>
    </main>
  )
}
