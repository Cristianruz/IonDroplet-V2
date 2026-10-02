'use client'

import { Bell, Camera, MessageCircle } from 'lucide-react'
import { ListaEnlaces } from '@/components/ui/lista-enlaces'

// Tres cosas que se hacen a menudo, a un toque desde Inicio. Van como
// renglones de una lista y no como tres cuadritos iguales: se leen de
// corrido, el texto no se corta y el dedo atina más fácil.

export function Accesos({ avisosSinVer }: { avisosSinVer: number }) {
  return (
    <ListaEnlaces
      etiqueta="Accesos rápidos"
      renglones={[
        { href: '/diagnostico', titulo: 'Revisar una planta', detalle: 'Tómale una foto y te digo qué puede tener', Icono: Camera },
        { href: '/asistente', titulo: 'Preguntar al asistente', detalle: 'Sobre riego, clima o plagas', Icono: MessageCircle },
        {
          href: '/alertas',
          titulo: 'Avisos',
          detalle: avisosSinVer > 0 ? `${avisosSinVer} sin ver` : 'Nada nuevo',
          Icono: Bell,
          contador: avisosSinVer,
        },
      ]}
    />
  )
}
