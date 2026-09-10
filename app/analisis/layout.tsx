import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Análisis — IonDroplet',
  description: 'Lo que el sistema ve en tu cultivo: riesgos, pronóstico y qué conviene hacer.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
