import type { Metadata } from 'next'

// Las páginas son de cliente y no pueden exportar metadata: por eso el título
// de cada pantalla vive en su propio layout.
export const metadata: Metadata = {
  title: 'Historial — IonDroplet',
  description: 'Cómo ha estado la humedad y qué ha pasado con el riego',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
