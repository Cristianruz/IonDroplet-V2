import { notFound } from 'next/navigation'
import { MODO_DEMO } from '@/lib/modo'
import { Proyector } from '@/components/demo/proyector'

// Solo existe en la demostración pública: la animación que corre sola en el
// proyector del evento. En la computadora del riego no hay nada que proyectar.
export default function Pagina() {
  if (!MODO_DEMO) notFound()
  return <Proyector />
}
