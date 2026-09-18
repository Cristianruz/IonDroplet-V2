import type { CSSProperties } from 'react'

// Color de una cápsula o franja de estado (.capsula, .franja-estado).
// El CSS lee --c; así el color sale del mismo token del semáforo.
export function colorEstado(c: string): CSSProperties {
  return { '--c': c } as CSSProperties
}
