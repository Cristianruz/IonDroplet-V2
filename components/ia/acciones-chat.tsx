'use client'

import { useState } from 'react'
import { Bot, Droplet, Hand, Square } from 'lucide-react'
import { useIonDroplet } from '@/hooks/use-iondroplet'
import type { AccionChat } from '@/hooks/use-asistente'
import { VincularAparato } from '@/components/ia/vincular-aparato'

// Lo que el chat propone y el productor confirma. La IA nunca mueve la bomba:
// solo pinta el botón; el toque es la confirmación.

const BOTON: Record<AccionChat, { texto: string; hecho: string; Icono: typeof Droplet; color: string }> = {
  regar: { texto: 'Regar ahora', hecho: 'Riego iniciado.', Icono: Droplet, color: 'var(--agua)' },
  detener: { texto: 'Detener el riego', hecho: 'Riego detenido.', Icono: Square, color: 'var(--peligro)' },
  automatico: { texto: 'Activar riego automático', hecho: 'Riego automático activado.', Icono: Bot, color: 'var(--acento)' },
  manual: { texto: 'Pasar a riego manual', hecho: 'Riego en manual: el sistema ya no riega solo.', Icono: Hand, color: 'var(--alerta)' },
}

interface PropsAccion {
  accion: AccionChat
  hecha: boolean
  onHecha: () => void
}

export function BotonAccionChat({ accion, hecha, onHecha }: PropsAccion) {
  const { estadoEsp, regarAhora, terminarRiegoManual, cambiarBomba, cambiarModo } = useIonDroplet({ conHistorial: false })
  const [ocupado, setOcupado] = useState(false)
  const { texto, hecho, Icono, color } = BOTON[accion]

  if (hecha) {
    return <p className="text-sm font-semibold" style={{ color: 'var(--ok)' }} role="status">✓ {hecho}</p>
  }

  async function ejecutar() {
    setOcupado(true)
    try {
      if (accion === 'regar') await regarAhora()
      else if (accion === 'detener') {
        // Si lo regó a mano, regresa al modo de antes; si regaba el sistema
        // solo, hay que pasar a manual para que la bomba obedezca el apagado.
        if (estadoEsp.autoMode) await cambiarBomba(false)
        else await terminarRiegoManual()
      } else await cambiarModo(accion === 'automatico')
      onHecha()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <button
      type="button"
      onClick={ejecutar}
      disabled={ocupado}
      className="boton w-fit"
      style={{ background: color, color: 'var(--sobre-estado)', boxShadow: 'var(--brillo-capsula)' }}
    >
      <Icono size={16} aria-hidden />
      {ocupado ? 'Un momento…' : texto}
    </button>
  )
}

/** Cuando falta la llave: vincular aquí mismo y hacer la pregunta que quedó. */
export function VincularEnChat({ pendiente, onVinculado }: { pendiente: string; onVinculado: () => void }) {
  return (
    <div className="aviso flex flex-col gap-3" role="note">
      <p>
        Para usar el asistente en este aparato hay que vincularlo una vez con la computadora del
        riego. Tu pregunta «{pendiente}» se enviará en cuanto quede vinculado.
      </p>
      <VincularAparato compacto onVinculado={onVinculado} />
    </div>
  )
}
