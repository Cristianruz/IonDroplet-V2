import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Avisos — IonDroplet',
  description: 'Lo que el sistema detectó y qué conviene hacer al respecto.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
