'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Sprout, Brain, TrendingUp, Settings } from 'lucide-react'

const DESTINOS = [
  { href: '/', etiqueta: 'Inicio', Icono: House },
  { href: '/parcela', etiqueta: 'Parcela', Icono: Sprout },
  { href: '/analisis', etiqueta: 'Análisis', Icono: Brain },
  { href: '/historial', etiqueta: 'Historial', Icono: TrendingUp },
  { href: '/ajustes', etiqueta: 'Ajustes', Icono: Settings },
]

export function NavInferior() {
  const ruta = usePathname()
  const indice = DESTINOS.findIndex(d =>
    d.href === '/' ? ruta === '/' : ruta.startsWith(d.href)
  )

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex"
      style={{
        borderTop: '1px solid var(--pista)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -2px 12px rgba(0,0,0,.05)',
      }}
      aria-label="Navegación principal"
    >
      {/* Una sola barra verde que se desliza al destino activo, en vez de que
          aparezca y desaparezca en cada pestaña. Se mueve con transform, que
          es lo único que el navegador anima sin repintar. */}
      {indice >= 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: 3,
            width: `${100 / DESTINOS.length}%`,
            background: 'var(--verde)',
            transform: `translateX(${indice * 100}%)`,
            transition: 'transform var(--normal) var(--curva)',
            borderRadius: '0 0 3px 3px',
          }}
        />
      )}

      {DESTINOS.map(({ href, etiqueta, Icono }, i) => {
        const activo = i === indice
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-sm"
            style={{
              minHeight: 56,
              paddingTop: 9,
              paddingBottom: 6,
              color: activo ? 'var(--verde)' : 'var(--tinta-suave)',
              fontWeight: activo ? 800 : 500,
            }}
          >
            {/* El icono del destino activo crece un pelito: se siente que
                respondió al toque sin necesidad de una animación aparatosa. */}
            <Icono
              size={26}
              aria-hidden
              style={{
                transform: activo ? 'scale(1.12)' : 'scale(1)',
                transition: 'transform var(--normal) var(--curva)',
              }}
            />
            {etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}
