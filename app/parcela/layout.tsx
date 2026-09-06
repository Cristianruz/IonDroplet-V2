import type { Metadata } from 'next'

// Las páginas son de cliente y no pueden exportar metadata: por eso el título
// de cada pantalla vive en su propio layout.
export const metadata: Metadata = {
  title: 'Mi parcela — IonDroplet',
  description: 'Qué se está cultivando y cuándo debe regar solo',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
