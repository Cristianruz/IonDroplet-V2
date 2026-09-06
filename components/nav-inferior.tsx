'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Sprout, Zap, TrendingUp, Settings } from 'lucide-react'

const DESTINOS = [
  { href: '/', etiqueta: 'Inicio', Icono: House },
  { href: '/parcela', etiqueta: 'Parcela', Icono: Sprout },
  { href: '/ionizacion', etiqueta: 'Ioniz.', Icono: Zap },
  { href: '/historial', etiqueta: 'Historial', Icono: TrendingUp },
  { href: '/ajustes', etiqueta: 'Ajustes', Icono: Settings },
]

export function NavInferior() {
  const ruta = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex"
      style={{
        background: 'var(--tarjeta)',
        borderTop: '1px solid #e5e7e2',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label="Navegación principal"
    >
      {DESTINOS.map(({ href, etiqueta, Icono }) => {
        const activo = href === '/' ? ruta === '/' : ruta.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-sm"
            style={{
              minHeight: 56,
              paddingTop: 6,
              paddingBottom: 6,
              // El activo se marca con borde arriba; el inactivo reserva el
              // mismo espacio para que los iconos no brinquen al cambiar.
              borderTop: activo ? '3px solid var(--verde)' : '3px solid transparent',
              color: activo ? 'var(--verde)' : 'var(--tinta-suave)',
              fontWeight: activo ? 800 : 500,
            }}
          >
            <Icono size={26} aria-hidden />
            {etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}
