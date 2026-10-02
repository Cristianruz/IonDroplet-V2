import { notFound } from 'next/navigation'
import { MODO_DEMO } from '@/lib/modo'
import { Presentacion } from '@/components/demo/presentacion'

// Solo existe en la demostración pública. En la computadora del riego no hay
// nada que presentar: ahí está la app de verdad.
export default function Pagina() {
  if (!MODO_DEMO) notFound()
  return <Presentacion />
}
