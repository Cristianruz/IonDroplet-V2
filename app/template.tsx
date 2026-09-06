'use client'

// Un template se vuelve a montar en cada navegación (a diferencia del layout),
// así que es el lugar para la transición de entrada de cada pantalla.
// La clase .pantalla la define globals.css y respeta prefers-reduced-motion.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="pantalla">{children}</div>
}
