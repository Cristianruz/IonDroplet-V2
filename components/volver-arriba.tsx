'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

// Aparece cuando ya bajaste bastante, y te regresa arriba de un toque.
// Va encima de la barra de navegación, sin taparla.

const ALTURA_PARA_APARECER = 600

export function VolverArriba() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // El scroll dispara muchísimo; se atiende en el siguiente cuadro de
    // pintado para no hacer trabajar de más al celular.
    let pendiente = false

    function alHacerScroll() {
      if (pendiente) return
      pendiente = true
      requestAnimationFrame(() => {
        setVisible(window.scrollY > ALTURA_PARA_APARECER)
        pendiente = false
      })
    }

    window.addEventListener('scroll', alHacerScroll, { passive: true })
    alHacerScroll()
    return () => window.removeEventListener('scroll', alHacerScroll)
  }, [])

  function subir() {
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: sinMovimiento ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={subir}
      aria-label="Volver arriba"
      // Se queda en el DOM y solo se esconde, para que la entrada y la
      // salida sean suaves en vez de un parpadeo.
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className="fixed z-40 rounded-full flex items-center justify-center"
      style={{
        left: 16,
        bottom: 'calc(76px + env(safe-area-inset-bottom))',
        width: 56,
        height: 56,
        color: 'var(--verde)',
        border: '2px solid var(--borde)',
        boxShadow: 'var(--sombra-elevada)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(.9)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity var(--normal) var(--curva), transform var(--normal) var(--curva)',
      }}
    >
      <ArrowUp size={18} aria-hidden />
    </button>
  )
}
