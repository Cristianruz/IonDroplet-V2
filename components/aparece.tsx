'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Aparece cuando entra en pantalla al hacer scroll.
// Con IntersectionObserver, que ya trae el navegador: nada de librerías.
// Se anima UNA vez y se deja de observar; si el agricultor sube y baja la
// pantalla, las tarjetas no le van a estar parpadeando.

interface Props {
  children: ReactNode
  /** Escalona la entrada de una lista de tarjetas. */
  retraso?: number
  className?: string
}

export function Aparece({ children, retraso = 0, className = '' }: Props) {
  const referencia = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const nodo = referencia.current
    if (!nodo) return

    // Si el navegador no lo soporta, se muestra y ya. Nunca se queda invisible.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observador = new IntersectionObserver(
      entradas => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            setVisible(true)
            observador.disconnect()
          }
        }
      },
      // Se dispara un poco antes de que llegue al borde, para que ya esté
      // puesta cuando el ojo la alcanza.
      { rootMargin: '0px 0px -60px 0px', threshold: 0.05 }
    )

    observador.observe(nodo)
    return () => observador.disconnect()
  }, [])

  return (
    <div
      ref={referencia}
      className={`aparece ${visible ? 'visible' : ''} ${className}`}
      style={{ animationDelay: `${retraso}ms` }}
    >
      {children}
    </div>
  )
}
