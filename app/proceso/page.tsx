import { notFound } from 'next/navigation'
import { MODO_DEMO } from '@/lib/modo'
import { Proceso } from '@/components/demo/proceso/proceso'

// Solo en la demostración pública: el recorrido del agua, para el proyector
// del evento o para grabarlo en video.
export default function Pagina() {
  if (!MODO_DEMO) notFound()
  return <Proceso />
}
