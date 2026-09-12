'use client'

import Link from 'next/link'
import { ArrowLeft, RadioTower, Sprout, Waves, Zap, type LucideIcon } from 'lucide-react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import { AparatoCard, type EstadoAparato } from '@/components/aparato-card'
import { AvisoSinConexion } from '@/components/aviso-sin-conexion'
import { haceCuanto } from '@/lib/tiempo'

// Un icono por aparato, aquí y no suelto en el JSX.
const ICONOS: Record<string, LucideIcon> = {
  central: RadioTower,
  sensorTierra: Sprout,
  bomba: Waves,
  ionizador: Zap,
}

// Verde si respondió hace menos de 2 minutos, ámbar si más, rojo si nunca.
const AL_CORRIENTE_MS = 2 * 60 * 1000

const PASOS_CENTRAL = [
  'Revisa que la computadora del riego esté prendida.',
  'Si está apagada, préndela y espera un minuto.',
  'Fíjate que esté en la misma red que tu teléfono.',
  'Si sigue sin responder, reiníciala y vuelve a entrar aquí.',
]

const PASOS_SENSOR = [
  'Ve a la parcela y revisa que el aparato esté enchufado.',
  'Fíjate que el cable del sensor no esté suelto ni mordido.',
  'Revisa que las puntas del sensor sigan enterradas en la tierra.',
  'Desconéctalo y vuélvelo a conectar. Espera un minuto y regresa a esta pantalla.',
]

export default function PantallaDispositivos() {
  const { conectado, estadoEsp, humedad, ultimaLectura, ionizacion } = useIonDroplet({
    conHistorial: false,
  })

  // La antigüedad sale del timestamp de la última lectura, no de un campo propio.
  const edad = ultimaLectura ? Date.now() - ultimaLectura.getTime() : null
  const estadoSensor: EstadoAparato =
    edad === null ? 'nunca' : edad < AL_CORRIENTE_MS ? 'bien' : 'tarde'

  const detalleSensor =
    ultimaLectura === null
      ? 'Nunca ha mandado una lectura'
      : `Midió ${Math.round(humedad ?? 0)}% ${haceCuanto(ultimaLectura)}`

  return (
    <main className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <Link
          href="/ajustes"
          className="flex items-center gap-2 text-base font-semibold w-fit"
          style={{ color: 'var(--verde)' }}
        >
          <ArrowLeft size={18} aria-hidden />
          Ajustes
        </Link>
        <h1 className="text-xl font-bold leading-tight">Aparatos del campo</h1>
      </header>

      {!conectado && <AvisoSinConexion />}

      <AparatoCard
        icono={ICONOS.central}
        nombre="Computadora del riego"
        detalle={conectado ? 'Responde bien' : 'No responde'}
        estado={conectado ? 'bien' : 'nunca'}
        pasos={PASOS_CENTRAL}
      />

      <AparatoCard
        icono={ICONOS.sensorTierra}
        nombre="Sensor de la tierra"
        detalle={detalleSensor}
        estado={estadoSensor}
        pasos={PASOS_SENSOR}
      />

      {/* Bomba e ionizador muestran estado, no antigüedad: no reportan nada
          por su cuenta, solo se sabe lo último que se les pidió. */}
      <AparatoCard
        icono={ICONOS.bomba}
        nombre="Bomba de riego"
        detalle={
          estadoEsp.autoMode
            ? 'La maneja el sistema, según la humedad de la tierra'
            : 'La manejas tú desde la pantalla de inicio'
        }
        estado={estadoEsp.pumpState === 1 ? 'activo' : 'apagado'}
        etiqueta={estadoEsp.pumpState === 1 ? 'Regando' : 'Sin regar'}
      />

      <AparatoCard
        icono={ICONOS.ionizador}
        nombre="Ionizador"
        detalle="No avisa su estado por su cuenta: aquí se ve lo último que se le pidió"
        estado={ionizacion ? 'activo' : 'apagado'}
        etiqueta={ionizacion ? 'Encendido' : 'Apagado'}
      />

      <p className="text-sm" style={{ color: 'var(--tinta-suave)' }}>
        Solo salen los aparatos que de verdad existen en tu sistema. El clima no aparece aquí
        porque no lo mide un aparato tuyo: viene de internet.
      </p>
    </main>
  )
}
