import { MODO_DEMO } from '@/lib/modo'

// En la demostración pública el asistente es la IA de verdad y el cultivo no:
// se dice en el chat mismo, donde alguien podría creer que los números de la
// conversación salieron de un campo real.

export function NotaIADemo({ corta = false }: { corta?: boolean }) {
  if (!MODO_DEMO) return null
  return corta ? (
    <span className="text-xs texto-apagado">IA real (Claude) · cultivo simulado</span>
  ) : (
    <p className="text-sm texto-apagado">
      Te contesta Claude, una IA real, con el clima real de Chihuahua. El cultivo, el sensor y los
      riegos son una simulación.
    </p>
  )
}
